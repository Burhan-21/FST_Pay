package com.fstpay.aicoach.strategy;

import com.fstpay.analytics.dto.AnalyticsResponse;
import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.wallet.entity.Wallet;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class GoalBehindSchedule implements TipStrategy {

    @Override
    public String generateTip(Wallet wallet, AnalyticsResponse analytics, List<WalletGoal> goals) {
        WalletGoal targetGoal = getBehindGoal(goals);
        if (targetGoal == null) return "🎯 Set up a new savings goal with a realistic target date to keep your financial progress focused!";
        return "🎯 Your goal '" + targetGoal.getName() + "' is behind schedule. Consider allocating a small auto top-up today to get back on track!";
    }

    @Override
    public boolean applies(Wallet wallet, AnalyticsResponse analytics, List<WalletGoal> goals) {
        return getBehindGoal(goals) != null;
    }

    private WalletGoal getBehindGoal(List<WalletGoal> goals) {
        if (goals == null || goals.isEmpty()) return null;
        for (WalletGoal goal : goals) {
            if ("ACTIVE".equals(goal.getStatus())) {
                LocalDate now = LocalDate.now();
                if (goal.getTargetDate().isAfter(now)) {
                    long totalDays = ChronoUnit.DAYS.between(goal.getCreatedAt() != null ? LocalDate.ofInstant(goal.getCreatedAt(), java.time.ZoneId.systemDefault()) : now.minusDays(1), goal.getTargetDate());
                    long elapsedDays = ChronoUnit.DAYS.between(goal.getCreatedAt() != null ? LocalDate.ofInstant(goal.getCreatedAt(), java.time.ZoneId.systemDefault()) : now.minusDays(1), now);
                    if (totalDays > 0) {
                        double timeProgress = (double) elapsedDays / totalDays;
                        BigDecimal amountProgress = goal.getCurrentAmount().divide(goal.getTargetAmount(), 4, RoundingMode.HALF_UP);
                        // If more than 30% of the duration has passed, but progress is less than half of timeProgress
                        if (timeProgress > 0.30 && amountProgress.doubleValue() < (timeProgress * 0.5)) {
                            return goal;
                        }
                    }
                }
            }
        }
        return null;
    }
}
