package com.fstpay.goal.service;

import com.fstpay.common.event.EventPublisher;
import com.fstpay.common.event.GoalCompletedEvent;
import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.goal.dto.GoalCreateRequest;
import com.fstpay.goal.dto.GoalFundRequest;
import com.fstpay.goal.dto.UpdateGoalRequest;
import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.goal.repository.WalletGoalRepository;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WalletGoalService {

    private final WalletGoalRepository walletGoalRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final EventPublisher eventPublisher;

    @Value("${rewards.goal-completed-points:100}")
    private int goalCompletedPoints;

    public List<WalletGoal> getGoalsByUserEmail(String email) {
        User user = getUserByEmail(email);
        return walletGoalRepository.findByUser(user);
    }

    public WalletGoal getGoalByIdAndUser(String email, UUID goalId) {
        User user = getUserByEmail(email);
        return walletGoalRepository.findByIdAndUser(goalId, user)
                .orElseThrow(() -> new ResourceNotFoundException("Savings goal not found"));
    }

    @Transactional
    public WalletGoal createGoal(String email, GoalCreateRequest request) {
        User user = getUserByEmail(email);

        if (request.getTargetAmount() == null || request.getTargetAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Target amount must be greater than zero");
        }

        if (request.getTargetDate() == null || request.getTargetDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Target date cannot be in the past");
        }

        // Unique goal name per user for active goals
        if (walletGoalRepository.existsByUserAndNameIgnoreCaseAndStatus(user, request.getName(), "ACTIVE")) {
            throw new BadRequestException("An active savings goal with this name already exists");
        }

        WalletGoal goal = WalletGoal.builder()
                .user(user)
                .name(request.getName().trim())
                .description(request.getDescription())
                .targetAmount(request.getTargetAmount().setScale(2, RoundingMode.HALF_UP))
                .currentAmount(BigDecimal.ZERO)
                .allocatedAmount(BigDecimal.ZERO)
                .withdrawnAmount(BigDecimal.ZERO)
                .targetDate(request.getTargetDate())
                .priority(request.getPriority() != null ? request.getPriority().toUpperCase() : "MEDIUM")
                .icon(request.getIcon() != null ? request.getIcon() : "🎯")
                .color(request.getColor())
                .status("ACTIVE")
                .build();

        return walletGoalRepository.save(goal);
    }

    @Transactional
    public WalletGoal updateGoal(String email, UUID goalId, UpdateGoalRequest request) {
        WalletGoal goal = getGoalByIdAndUser(email, goalId);

        if ("CANCELLED".equals(goal.getStatus())) {
            throw new BadRequestException("Cancelled goals cannot be modified");
        }

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            // If the name has changed, ensure it's unique among active goals
            if (!goal.getName().equalsIgnoreCase(request.getName().trim()) &&
                    walletGoalRepository.existsByUserAndNameIgnoreCaseAndStatus(goal.getUser(), request.getName(), "ACTIVE")) {
                throw new BadRequestException("An active savings goal with this name already exists");
            }
            goal.setName(request.getName().trim());
        }

        if (request.getDescription() != null) {
            goal.setDescription(request.getDescription());
        }

        if (request.getTargetAmount() != null) {
            if (request.getTargetAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BadRequestException("Target amount must be greater than zero");
            }
            goal.setTargetAmount(request.getTargetAmount().setScale(2, RoundingMode.HALF_UP));
        }

        if (request.getTargetDate() != null) {
            if (request.getTargetDate().isBefore(LocalDate.now())) {
                throw new BadRequestException("Target date cannot be in the past");
            }
            goal.setTargetDate(request.getTargetDate());
        }

        if (request.getPriority() != null) {
            goal.setPriority(request.getPriority().toUpperCase());
        }

        if (request.getIcon() != null) {
            goal.setIcon(request.getIcon());
        }

        if (request.getColor() != null) {
            goal.setColor(request.getColor());
        }

        if (request.getStatus() != null) {
            String newStatus = request.getStatus().toUpperCase();
            if ("CANCELLED".equals(newStatus)) {
                cancelGoalInternal(goal);
            }
        }

        return walletGoalRepository.save(goal);
    }

    @Transactional
    public void deleteGoal(String email, UUID goalId) {
        WalletGoal goal = getGoalByIdAndUser(email, goalId);
        if (!"CANCELLED".equals(goal.getStatus())) {
            cancelGoalInternal(goal);
            walletGoalRepository.save(goal);
        }
    }

    @Transactional
    public WalletGoal allocateFunds(String email, UUID goalId, GoalFundRequest request) {
        WalletGoal goal = getGoalByIdAndUser(email, goalId);

        if (!"ACTIVE".equals(goal.getStatus())) {
            throw new BadRequestException("Completed or Cancelled goals cannot receive additional funds");
        }

        BigDecimal amount = request.getAmount().setScale(2, RoundingMode.HALF_UP);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Allocation amount must be greater than zero");
        }

        Wallet wallet = walletRepository.findByUser(goal.getUser())
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));

        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new BadRequestException("Insufficient wallet balance");
        }

        // Deduct from Wallet
        wallet.setBalance(wallet.getBalance().subtract(amount));
        walletRepository.save(wallet);

        // Record Transaction
        Transaction transaction = Transaction.builder()
                .wallet(wallet)
                .type("DEBIT")
                .category("SAVINGS")
                .amount(amount)
                .balanceAfter(wallet.getBalance())
                .description("Goal allocation: " + goal.getName())
                .merchant("Savings Goal: " + goal.getName())
                .referenceId("ALLOC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .status("COMPLETED")
                .build();
        transactionRepository.save(transaction);

        // Update Goal
        goal.setCurrentAmount(goal.getCurrentAmount().add(amount));
        goal.setAllocatedAmount(goal.getAllocatedAmount().add(amount));

        // Check completion
        boolean justCompleted = false;
        if (goal.getCurrentAmount().compareTo(goal.getTargetAmount()) >= 0) {
            goal.setStatus("COMPLETED");
            goal.setCompletedAt(Instant.now());
            justCompleted = true;
        }

        WalletGoal savedGoal = walletGoalRepository.save(goal);

        if (justCompleted) {
            eventPublisher.publish(GoalCompletedEvent.create(
                    savedGoal.getUser(),
                    savedGoal.getId(),
                    savedGoal.getName(),
                    savedGoal.getTargetAmount(),
                    goalCompletedPoints
            ));
            log.info("Goal completed: {} for user {}. GoalCompletedEvent published.", savedGoal.getName(), email);
        }

        return savedGoal;
    }

    @Transactional
    public WalletGoal withdrawFunds(String email, UUID goalId, GoalFundRequest request) {
        WalletGoal goal = getGoalByIdAndUser(email, goalId);

        if ("CANCELLED".equals(goal.getStatus())) {
            throw new BadRequestException("Cannot withdraw from a cancelled goal");
        }

        BigDecimal amount = request.getAmount().setScale(2, RoundingMode.HALF_UP);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Withdrawal amount must be greater than zero");
        }

        if (goal.getCurrentAmount().compareTo(amount) < 0) {
            throw new BadRequestException("Withdrawal cannot exceed the amount allocated to the goal");
        }

        Wallet wallet = walletRepository.findByUser(goal.getUser())
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));

        // Refund to Wallet
        wallet.setBalance(wallet.getBalance().add(amount));
        walletRepository.save(wallet);

        // Record Transaction
        Transaction transaction = Transaction.builder()
                .wallet(wallet)
                .type("CREDIT")
                .category("SAVINGS")
                .amount(amount)
                .balanceAfter(wallet.getBalance())
                .description("Goal withdrawal: " + goal.getName())
                .merchant("Savings Goal: " + goal.getName())
                .referenceId("WITHD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .status("COMPLETED")
                .build();
        transactionRepository.save(transaction);

        // Update Goal
        goal.setCurrentAmount(goal.getCurrentAmount().subtract(amount));
        goal.setWithdrawnAmount(goal.getWithdrawnAmount().add(amount));

        // If goal status was COMPLETED and we fall below target, revert back to ACTIVE
        if ("COMPLETED".equals(goal.getStatus()) && goal.getCurrentAmount().compareTo(goal.getTargetAmount()) < 0) {
            goal.setStatus("ACTIVE");
            goal.setCompletedAt(null);
        }

        return walletGoalRepository.save(goal);
    }

    private void cancelGoalInternal(WalletGoal goal) {
        goal.setStatus("CANCELLED");
        goal.setCancelledAt(Instant.now());

        // Refund any saved amount to the main wallet
        if (goal.getCurrentAmount().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal refundAmount = goal.getCurrentAmount();
            Wallet wallet = walletRepository.findByUser(goal.getUser())
                    .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));

            wallet.setBalance(wallet.getBalance().add(refundAmount));
            walletRepository.save(wallet);

            Transaction transaction = Transaction.builder()
                    .wallet(wallet)
                    .type("CREDIT")
                    .category("SAVINGS")
                    .amount(refundAmount)
                    .balanceAfter(wallet.getBalance())
                    .description("Refund from cancelled goal: " + goal.getName())
                    .merchant("Savings Goal: " + goal.getName())
                    .referenceId("RFND-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                    .status("COMPLETED")
                    .build();
            transactionRepository.save(transaction);

            goal.setCurrentAmount(BigDecimal.ZERO);
            goal.setWithdrawnAmount(goal.getWithdrawnAmount().add(refundAmount));
        }
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
