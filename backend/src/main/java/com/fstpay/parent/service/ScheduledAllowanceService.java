package com.fstpay.parent.service;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.goal.repository.WalletGoalRepository;
import com.fstpay.goal.service.WalletGoalService;
import com.fstpay.notification.enums.NotificationType;
import com.fstpay.notification.service.NotificationService;
import com.fstpay.parent.dto.CreateAllowanceRequest;
import com.fstpay.parent.dto.ScheduledAllowanceResponse;
import com.fstpay.parent.dto.UpdateAllowanceRequest;
import com.fstpay.parent.entity.ScheduledAllowance;
import com.fstpay.parent.enums.AllowanceFrequency;
import com.fstpay.parent.repository.ScheduledAllowanceRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.api.WalletOperations;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduledAllowanceService {

    private final ScheduledAllowanceRepository scheduledAllowanceRepository;
    private final ParentLinkService parentLinkService;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final WalletOperations walletService;
    private final WalletGoalRepository walletGoalRepository;
    private final WalletGoalService walletGoalService;
    private final NotificationService notificationService;

    @Setter
    @Autowired(required = false)
    private MeterRegistry meterRegistry = new SimpleMeterRegistry();

    @Transactional
    public ScheduledAllowanceResponse createAllowance(String parentEmail, CreateAllowanceRequest request) {
        User parent = userRepository.findByEmail(parentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Parent not found"));

        User child = parentLinkService.getAuthorizedChild(parentEmail, request.getChildId());

        WalletGoal targetGoal = null;
        if (request.getTargetGoalId() != null) {
            targetGoal = walletGoalRepository.findByIdAndUser(request.getTargetGoalId(), child)
                    .orElseThrow(() -> new ResourceNotFoundException("Target savings goal not found for child"));
        }

        BigDecimal amount = request.getAmount().setScale(2, RoundingMode.HALF_UP);
        LocalDate nextRunDate = calculateNextRunDate(
                request.getFrequency(),
                request.getDayOfWeek(),
                request.getDayOfMonth(),
                LocalDate.now()
        );

        ScheduledAllowance schedule = ScheduledAllowance.builder()
                .parent(parent)
                .child(child)
                .amount(amount)
                .frequency(request.getFrequency())
                .dayOfWeek(request.getDayOfWeek() != null ? request.getDayOfWeek() : DayOfWeek.MONDAY)
                .dayOfMonth(request.getDayOfMonth() != null ? request.getDayOfMonth() : 1)
                .targetGoal(targetGoal)
                .note(request.getNote())
                .active(true)
                .nextRunDate(nextRunDate)
                .build();

        ScheduledAllowance saved = scheduledAllowanceRepository.save(schedule);
        log.info("Created scheduled allowance {} for parent {} to child {} (Amount: ₹{}, Next: {})",
                saved.getId(), parentEmail, child.getEmail(), amount, nextRunDate);

        return mapToResponse(saved);
    }

    public List<ScheduledAllowanceResponse> getAllowancesForParent(String parentEmail) {
        User parent = userRepository.findByEmail(parentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Parent not found"));

        return scheduledAllowanceRepository.findByParent(parent).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ScheduledAllowanceResponse updateAllowance(String parentEmail, UUID scheduleId, UpdateAllowanceRequest request) {
        User parent = userRepository.findByEmail(parentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Parent not found"));

        ScheduledAllowance schedule = scheduledAllowanceRepository.findByIdAndParent(scheduleId, parent)
                .orElseThrow(() -> new ResourceNotFoundException("Scheduled allowance not found"));

        if (request.getAmount() != null) {
            schedule.setAmount(request.getAmount().setScale(2, RoundingMode.HALF_UP));
        }

        boolean scheduleChanged = false;
        if (request.getFrequency() != null) {
            schedule.setFrequency(request.getFrequency());
            scheduleChanged = true;
        }

        if (request.getDayOfWeek() != null) {
            schedule.setDayOfWeek(request.getDayOfWeek());
            scheduleChanged = true;
        }

        if (request.getDayOfMonth() != null) {
            schedule.setDayOfMonth(request.getDayOfMonth());
            scheduleChanged = true;
        }

        if (request.getTargetGoalId() != null) {
            WalletGoal goal = walletGoalRepository.findByIdAndUser(request.getTargetGoalId(), schedule.getChild())
                    .orElseThrow(() -> new ResourceNotFoundException("Target savings goal not found for child"));
            schedule.setTargetGoal(goal);
        }

        if (request.getNote() != null) {
            schedule.setNote(request.getNote());
        }

        if (request.getActive() != null) {
            schedule.setActive(request.getActive());
        }

        if (scheduleChanged) {
            schedule.setNextRunDate(calculateNextRunDate(
                    schedule.getFrequency(),
                    schedule.getDayOfWeek(),
                    schedule.getDayOfMonth(),
                    LocalDate.now()
            ));
        }

        ScheduledAllowance saved = scheduledAllowanceRepository.save(schedule);
        log.info("Updated scheduled allowance {} for parent {}", saved.getId(), parentEmail);

        return mapToResponse(saved);
    }

    @Transactional
    public void deleteAllowance(String parentEmail, UUID scheduleId) {
        User parent = userRepository.findByEmail(parentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Parent not found"));

        ScheduledAllowance schedule = scheduledAllowanceRepository.findByIdAndParent(scheduleId, parent)
                .orElseThrow(() -> new ResourceNotFoundException("Scheduled allowance not found"));

        scheduledAllowanceRepository.delete(schedule);
        log.info("Deleted scheduled allowance {} for parent {}", scheduleId, parentEmail);
    }

    @Transactional
    public boolean executeScheduledAllowance(ScheduledAllowance schedule) {
        if (!Boolean.TRUE.equals(schedule.getActive())) {
            return false;
        }

        User parent = schedule.getParent();
        User child = schedule.getChild();
        BigDecimal amount = schedule.getAmount();

        Wallet parentWallet = walletRepository.findByUser(parent)
                .orElseThrow(() -> new ResourceNotFoundException("Parent wallet not found"));

        if (parentWallet.getBalance().compareTo(amount) < 0) {
            log.warn("Scheduled allowance {} skipped: Insufficient wallet balance for parent {}",
                    schedule.getId(), parent.getEmail());

            if (notificationService != null) {
                try {
                    notificationService.sendNotification(
                            parent,
                            null,
                            NotificationType.POCKET_MONEY,
                            "Scheduled Allowance Failed: Low Balance",
                            String.format("Unable to send ₹%.2f allowance to %s due to insufficient wallet funds.",
                                    amount, child.getFullName())
                    );
                } catch (Exception e) {
                    log.warn("Failed to dispatch low-balance notification: {}", e.getMessage());
                }
            }

            if (meterRegistry != null) {
                try {
                    meterRegistry.counter("fstpay.allowance.sweeps.total",
                            "status", "insufficient_funds",
                            "frequency", schedule.getFrequency().name()).increment();
                } catch (Exception ignored) {}
            }

            return false;
        }

        // 1. Transfer allowance from parent to child
        String desc = schedule.getNote() != null && !schedule.getNote().isBlank()
                ? schedule.getNote()
                : "Scheduled Allowance";
        walletService.transfer(parent, child, amount, "TRANSFER", desc, "FST Pay Family");

        // 2. Direct Auto-Sweep into Goal (if configured)
        boolean autoSwept = false;
        if (schedule.getTargetGoal() != null && "ACTIVE".equals(schedule.getTargetGoal().getStatus())) {
            try {
                walletGoalService.allocateFundsFromTransfer(child, schedule.getTargetGoal(), amount);
                autoSwept = true;
            } catch (Exception e) {
                log.warn("Auto-sweep into goal failed for child {}: {}", child.getEmail(), e.getMessage());
            }
        }

        // 3. Dispatch Notifications
        if (notificationService != null) {
            try {
                if (autoSwept) {
                    notificationService.sendNotification(
                            child,
                            parent,
                            NotificationType.POCKET_MONEY,
                            "Scheduled Allowance Auto-Swept! 🎯",
                            String.format("₹%.2f allowance was automatically swept into your '%s' savings goal.",
                                    amount, schedule.getTargetGoal().getName())
                    );
                } else {
                    notificationService.sendNotification(
                            child,
                            parent,
                            NotificationType.POCKET_MONEY,
                            "Scheduled Allowance Received! 🎉",
                            String.format("You received ₹%.2f pocket money allowance from %s.",
                                    amount, parent.getFullName())
                    );
                }

                notificationService.sendNotification(
                        parent,
                        null,
                        NotificationType.POCKET_MONEY,
                        "Scheduled Allowance Dispatched",
                        String.format("Successfully sent ₹%.2f allowance to %s.",
                                amount, child.getFullName())
                );
            } catch (Exception e) {
                log.warn("Failed to dispatch allowance notifications: {}", e.getMessage());
            }
        }

        // 4. Record Metrics
        if (meterRegistry != null) {
            try {
                meterRegistry.counter("fstpay.allowance.sweeps.total",
                        "status", "success",
                        "frequency", schedule.getFrequency().name()).increment();
                meterRegistry.counter("fstpay.allowance.amount.total").increment(amount.doubleValue());
            } catch (Exception ignored) {}
        }

        // 5. Update Schedule Run Dates
        LocalDate today = LocalDate.now();
        schedule.setLastRunDate(today);
        schedule.setNextRunDate(advanceNextRunDate(
                schedule.getFrequency(),
                schedule.getDayOfWeek(),
                schedule.getDayOfMonth(),
                today
        ));
        scheduledAllowanceRepository.save(schedule);

        log.info("Executed scheduled allowance {} (Amount: ₹{}, Next run: {})",
                schedule.getId(), amount, schedule.getNextRunDate());
        return true;
    }

    @Transactional
    public int executeAllDueAllowances() {
        LocalDate today = LocalDate.now();
        List<ScheduledAllowance> dueSchedules = scheduledAllowanceRepository
                .findByActiveTrueAndNextRunDateLessThanEqual(today);

        int count = 0;
        for (ScheduledAllowance schedule : dueSchedules) {
            try {
                if (executeScheduledAllowance(schedule)) {
                    count++;
                }
            } catch (Exception e) {
                log.error("Error executing scheduled allowance {}: {}", schedule.getId(), e.getMessage());
                if (meterRegistry != null) {
                    try {
                        meterRegistry.counter("fstpay.allowance.sweeps.total",
                                "status", "error",
                                "frequency", schedule.getFrequency().name()).increment();
                    } catch (Exception ignored) {}
                }
            }
        }
        return count;
    }

    @Transactional
    public ScheduledAllowanceResponse triggerAllowanceNow(String parentEmail, UUID scheduleId) {
        User parent = userRepository.findByEmail(parentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Parent not found"));

        ScheduledAllowance schedule = scheduledAllowanceRepository.findByIdAndParent(scheduleId, parent)
                .orElseThrow(() -> new ResourceNotFoundException("Scheduled allowance not found"));

        executeScheduledAllowance(schedule);
        return mapToResponse(schedule);
    }

    public LocalDate calculateNextRunDate(AllowanceFrequency freq, DayOfWeek dow, Integer dom, LocalDate fromDate) {
        DayOfWeek targetDow = dow != null ? dow : DayOfWeek.MONDAY;
        int targetDom = (dom != null && dom >= 1 && dom <= 28) ? dom : 1;

        switch (freq) {
            case WEEKLY:
                if (fromDate.getDayOfWeek() == targetDow) {
                    return fromDate;
                }
                return fromDate.with(TemporalAdjusters.next(targetDow));
            case BIWEEKLY:
                if (fromDate.getDayOfWeek() == targetDow) {
                    return fromDate;
                }
                return fromDate.with(TemporalAdjusters.next(targetDow));
            case MONTHLY:
                if (fromDate.getDayOfMonth() <= targetDom) {
                    return fromDate.withDayOfMonth(targetDom);
                }
                return fromDate.plusMonths(1).withDayOfMonth(targetDom);
            default:
                return fromDate;
        }
    }

    private LocalDate advanceNextRunDate(AllowanceFrequency freq, DayOfWeek dow, Integer dom, LocalDate lastRunDate) {
        DayOfWeek targetDow = dow != null ? dow : DayOfWeek.MONDAY;
        int targetDom = (dom != null && dom >= 1 && dom <= 28) ? dom : 1;

        switch (freq) {
            case WEEKLY:
                return lastRunDate.plusWeeks(1).with(TemporalAdjusters.nextOrSame(targetDow));
            case BIWEEKLY:
                return lastRunDate.plusWeeks(2).with(TemporalAdjusters.nextOrSame(targetDow));
            case MONTHLY:
                return lastRunDate.plusMonths(1).withDayOfMonth(targetDom);
            default:
                return lastRunDate.plusWeeks(1);
        }
    }

    private ScheduledAllowanceResponse mapToResponse(ScheduledAllowance s) {
        return ScheduledAllowanceResponse.builder()
                .id(s.getId())
                .parentId(s.getParent().getId())
                .parentName(s.getParent().getFullName())
                .childId(s.getChild().getId())
                .childName(s.getChild().getFullName())
                .childEmail(s.getChild().getEmail())
                .amount(s.getAmount())
                .frequency(s.getFrequency())
                .dayOfWeek(s.getDayOfWeek())
                .dayOfMonth(s.getDayOfMonth())
                .targetGoalId(s.getTargetGoal() != null ? s.getTargetGoal().getId() : null)
                .targetGoalName(s.getTargetGoal() != null ? s.getTargetGoal().getName() : null)
                .note(s.getNote())
                .active(s.getActive())
                .nextRunDate(s.getNextRunDate())
                .lastRunDate(s.getLastRunDate())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}
