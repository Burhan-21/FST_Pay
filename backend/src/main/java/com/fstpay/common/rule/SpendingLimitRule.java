package com.fstpay.common.rule;

import com.fstpay.transaction.dto.SimulateSpendRequest;
import com.fstpay.user.entity.User;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.service.WalletDailySummaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;

@Slf4j
@Component
@Order(4)
@RequiredArgsConstructor
public class SpendingLimitRule implements TransactionRule {

    private final WalletDailySummaryService summaryService;

    @Override
    public RuleEvaluationResult evaluate(User user, Wallet wallet, SimulateSpendRequest request) {
        if (user.getParentalControlEnabled() == null || !user.getParentalControlEnabled()) {
            return RuleEvaluationResult.builder()
                    .status(RuleStatus.NOT_REQUIRED)
                    .message("Parental controls disabled")
                    .build();
        }

        log.info("Evaluating SpendingLimitRule for user: {}", user.getEmail());

        // 1. Single Transaction Limit
        if (user.getParentalMaxTxnAmount() != null && user.getParentalMaxTxnAmount().compareTo(BigDecimal.ZERO) > 0) {
            if (request.getAmount().compareTo(user.getParentalMaxTxnAmount()) > 0) {
                return RuleEvaluationResult.builder()
                        .status(RuleStatus.PENDING)
                        .message("Blocked: Exceeds max transaction limit of ₹" + user.getParentalMaxTxnAmount())
                        .build();
            }
        }

        LocalDate today = LocalDate.now();

        // 2. Daily Limit Check
        if (user.getParentalDailyLimit() != null && user.getParentalDailyLimit().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal dailySpent = summaryService.getSpentAmountBetween(wallet.getId(), today, today);
            if (dailySpent.add(request.getAmount()).compareTo(user.getParentalDailyLimit()) > 0) {
                return RuleEvaluationResult.builder()
                        .status(RuleStatus.PENDING)
                        .message("Blocked: Exceeds daily spending limit of ₹" + 
                                user.getParentalDailyLimit() + " (spent today: ₹" + dailySpent + ")")
                        .build();
            }
        }

        // 3. Weekly Limit Check
        if (user.getParentalWeeklyLimit() != null && user.getParentalWeeklyLimit().compareTo(BigDecimal.ZERO) > 0) {
            LocalDate startOfWeek = today.minusDays(6);
            BigDecimal weeklySpent = summaryService.getSpentAmountBetween(wallet.getId(), startOfWeek, today);
            if (weeklySpent.add(request.getAmount()).compareTo(user.getParentalWeeklyLimit()) > 0) {
                return RuleEvaluationResult.builder()
                        .status(RuleStatus.PENDING)
                        .message("Blocked: Exceeds weekly spending limit of ₹" + 
                                user.getParentalWeeklyLimit() + " (spent last 7 days: ₹" + weeklySpent + ")")
                        .build();
            }
        }

        // 4. Monthly Limit Check
        if (user.getParentalMonthlyLimit() != null && user.getParentalMonthlyLimit().compareTo(BigDecimal.ZERO) > 0) {
            LocalDate startOfMonth = today.minusDays(29);
            BigDecimal monthlySpent = summaryService.getSpentAmountBetween(wallet.getId(), startOfMonth, today);
            if (monthlySpent.add(request.getAmount()).compareTo(user.getParentalMonthlyLimit()) > 0) {
                return RuleEvaluationResult.builder()
                        .status(RuleStatus.PENDING)
                        .message("Blocked: Exceeds monthly spending limit of ₹" + 
                                user.getParentalMonthlyLimit() + " (spent last 30 days: ₹" + monthlySpent + ")")
                        .build();
            }
        }

        return RuleEvaluationResult.builder()
                .status(RuleStatus.APPROVED)
                .message("Spending limits check passed")
                .build();
    }
}
