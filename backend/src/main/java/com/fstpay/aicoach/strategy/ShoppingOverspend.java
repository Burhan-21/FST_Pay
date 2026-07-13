package com.fstpay.aicoach.strategy;

import com.fstpay.analytics.dto.AnalyticsResponse;
import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.wallet.entity.Wallet;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Component
public class ShoppingOverspend implements TipStrategy {

    @Override
    public String generateTip(Wallet wallet, AnalyticsResponse analytics, List<WalletGoal> goals) {
        BigDecimal shoppingSpend = analytics.getSpendByCategory().getOrDefault("SHOPPING", BigDecimal.ZERO);
        BigDecimal totalSpend = analytics.getTotalDebit();
        BigDecimal percent = shoppingSpend.divide(totalSpend, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).setScale(0, RoundingMode.HALF_UP);
        return "🛍️ Shopping accounts for " + percent + "% (₹" + shoppingSpend + ") of your monthly spend. Consider using a '24-hour rule' before checking out non-essentials!";
    }

    @Override
    public boolean applies(Wallet wallet, AnalyticsResponse analytics, List<WalletGoal> goals) {
        if (analytics.getSpendByCategory() == null) return false;
        BigDecimal shoppingSpend = analytics.getSpendByCategory().getOrDefault("SHOPPING", BigDecimal.ZERO);
        BigDecimal totalSpend = analytics.getTotalDebit();
        if (totalSpend.compareTo(BigDecimal.ZERO) <= 0) return false;

        BigDecimal percent = shoppingSpend.divide(totalSpend, 4, RoundingMode.HALF_UP);
        return percent.compareTo(new BigDecimal("0.25")) > 0;
    }
}
