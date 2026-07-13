package com.fstpay.aicoach.strategy;

import com.fstpay.analytics.dto.AnalyticsResponse;
import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.wallet.entity.Wallet;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Component
public class SavingsLow implements TipStrategy {

    @Override
    public String generateTip(Wallet wallet, AnalyticsResponse analytics, List<WalletGoal> goals) {
        BigDecimal savingsRate = BigDecimal.ZERO;
        if (analytics.getTotalCredit().compareTo(BigDecimal.ZERO) > 0) {
            savingsRate = analytics.getNetSavings()
                    .divide(analytics.getTotalCredit(), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    .setScale(0, RoundingMode.HALF_UP);
        }
        return "📉 Your monthly savings rate is currently " + savingsRate + "%. Try saving 5-10% of every top-up first (pay yourself first!) before spending it.";
    }

    @Override
    public boolean applies(Wallet wallet, AnalyticsResponse analytics, List<WalletGoal> goals) {
        BigDecimal income = analytics.getTotalCredit();
        if (income.compareTo(BigDecimal.ZERO) <= 0) return true; // Savings are low if there's no income!

        BigDecimal netSavings = analytics.getNetSavings();
        BigDecimal savingsRate = netSavings.divide(income, 4, RoundingMode.HALF_UP);
        return savingsRate.compareTo(new BigDecimal("0.15")) < 0;
    }
}
