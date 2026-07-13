package com.fstpay.parent.service;

import com.fstpay.card.entity.VirtualCard;
import com.fstpay.card.repository.VirtualCardRepository;
import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.parent.entity.TransactionApproval;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.user.entity.User;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApprovalProcessor {

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final VirtualCardRepository virtualCardRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public void process(TransactionApproval approval) {
        String type = approval.getRequestType().toUpperCase();
        User child = approval.getChild();

        switch (type) {
            case "SPEND":
                executeSpend(child, approval.getAmount(), approval.getCategory(), approval.getMerchant(), approval.getDescription());
                break;
            case "CARD_FREEZE":
                executeCardStatusChange(child, approval.getTargetId(), "FROZEN");
                break;
            case "CARD_UNFREEZE":
                executeCardStatusChange(child, approval.getTargetId(), "ACTIVE");
                break;
            case "CARD_GENERATE":
                executeCardGenerate(child, approval.getDescription(), approval.getAmount());
                break;
            default:
                throw new BadRequestException("Unsupported approval request type: " + type);
        }
    }

    private void executeSpend(User child, BigDecimal amount, String category, String merchant, String description) {
        Wallet wallet = walletRepository.findByUser(child)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));

        if (!wallet.getIsActive()) {
            throw new BadRequestException("Child wallet is inactive");
        }

        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new BadRequestException("Insufficient child wallet balance");
        }

        // Deduct balance
        wallet.setBalance(wallet.getBalance().subtract(amount));
        walletRepository.save(wallet);

        // Record debit transaction
        Transaction transaction = Transaction.builder()
                .wallet(wallet)
                .type("DEBIT")
                .category(category != null ? category.toUpperCase() : "PURCHASE")
                .amount(amount)
                .balanceAfter(wallet.getBalance())
                .description(description + " (Parent Approved)")
                .merchant(merchant)
                .referenceId("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .status("COMPLETED")
                .build();

        transactionRepository.save(transaction);
        log.info("Executed approved spend of ₹{} for child {}", amount, child.getEmail());
    }

    private void executeCardStatusChange(User child, String targetId, String newStatus) {
        if (targetId == null || targetId.isEmpty()) {
            throw new BadRequestException("Target card ID is required");
        }
        UUID cardId = UUID.fromString(targetId);
        VirtualCard card = virtualCardRepository.findByIdAndUser(cardId, child)
                .orElseThrow(() -> new ResourceNotFoundException("Virtual card not found for this child"));

        card.setStatus(newStatus);
        virtualCardRepository.save(card);
        log.info("Executed card status update to {} for card {} of child {}", newStatus, cardId, child.getEmail());
    }

    private void executeCardGenerate(User child, String cardHolder, BigDecimal spendingLimit) {
        String cardNumber = generateCardNumber();
        LocalDate expiryDate = LocalDate.now().plusYears(3);
        String rawCvv = String.format("%03d", random.nextInt(1000));
        String cvvHash = passwordEncoder.encode(rawCvv);

        BigDecimal limit = spendingLimit != null ? spendingLimit : new BigDecimal("10000.00");

        VirtualCard card = VirtualCard.builder()
                .user(child)
                .cardNumber(cardNumber)
                .cardHolder(cardHolder != null && !cardHolder.isEmpty() ? cardHolder : child.getFullName())
                .expiryMonth(expiryDate.getMonthValue())
                .expiryYear(expiryDate.getYear())
                .cvvHash(cvvHash)
                .cardType("PREPAID")
                .status("ACTIVE")
                .spendingLimit(limit)
                .dailyLimit(limit.divide(new BigDecimal("5"), 2, BigDecimal.ROUND_HALF_UP))
                .isOneTime(false)
                .build();

        virtualCardRepository.save(card);
        log.info("Executed approved card generation for child {}", child.getEmail());
    }

    private String generateCardNumber() {
        StringBuilder sb = new StringBuilder("4532");
        for (int i = 0; i < 12; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }
}
