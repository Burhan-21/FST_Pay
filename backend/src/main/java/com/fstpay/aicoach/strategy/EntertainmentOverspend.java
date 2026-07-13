package com.fstpay.aicoach.strategy;

import com.fstpay.analytics.dto.AnalyticsResponse;
import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.wallet.entity.Wallet;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Component
public class EntertainmentOverspend implements TipStrategy {

    @Override
    public String generateTip(Wallet wallet, AnalyticsResponse analytics, List<WalletGoal> goals) {
        BigDecimal entertainmentSpend = analytics.getSpendByCategory().getOrDefault("ENTERTAINMENT", BigDecimal.ZERO);
        return "🍿 Entertainment spending is higher than average (₹" + entertainmentSpend + "). Audit your subscriptions to see if you have unused ones you can cancel!";
    }

    @Override
    public boolean applies(Wallet wallet, AnalyticsResponse analytics, List<WalletGoal> goals) {
        if (analytics.getSpendByCategory() == null) return false;
        BigDecimal entertainmentSpend = analytics.getSpendByCategory().getOrDefault("ENTERTAINMENT", BigDecimal.ZERO);
        BigDecimal totalSpend = analytics.getTotalDebit();
        if (totalSpend.compareTo(BigDecimal.ZERO) <= 0) return false;

        BigDecimal percent = entertainmentSpend.divide(totalSpend, 4, RoundingMode.HALF_UP);
        return percent.compareTo(new BigDecimal("0.20")) > 0;
    }
}
