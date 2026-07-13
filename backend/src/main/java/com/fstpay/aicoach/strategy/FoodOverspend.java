package com.fstpay.aicoach.strategy;

import com.fstpay.analytics.dto.AnalyticsResponse;
import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.wallet.entity.Wallet;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Component
public class FoodOverspend implements TipStrategy {

    @Override
    public String generateTip(Wallet wallet, AnalyticsResponse analytics, List<WalletGoal> goals) {
        BigDecimal foodSpend = analytics.getSpendByCategory().getOrDefault("FOOD", BigDecimal.ZERO);
        BigDecimal savingsPotential = foodSpend.multiply(new BigDecimal("0.10")).setScale(2, RoundingMode.HALF_UP);
        return "🍔 You spent ₹" + foodSpend + " on Food this month. Reducing dining out by just 10% could free up ₹" 
                + savingsPotential + " to fund your savings goals!";
    }

    @Override
    public boolean applies(Wallet wallet, AnalyticsResponse analytics, List<WalletGoal> goals) {
        if (analytics.getSpendByCategory() == null) return false;
        BigDecimal foodSpend = analytics.getSpendByCategory().getOrDefault("FOOD", BigDecimal.ZERO);
        BigDecimal totalSpend = analytics.getTotalDebit();
        if (totalSpend.compareTo(BigDecimal.ZERO) <= 0) return false;

        BigDecimal percent = foodSpend.divide(totalSpend, 4, RoundingMode.HALF_UP);
        return percent.compareTo(new BigDecimal("0.30")) > 0;
    }
}
