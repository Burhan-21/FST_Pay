package com.fstpay.aicoach.strategy;

import com.fstpay.analytics.dto.AnalyticsResponse;
import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.wallet.entity.Wallet;

import java.util.List;

public interface TipStrategy {
    String generateTip(Wallet wallet, AnalyticsResponse analytics, List<WalletGoal> goals);
    boolean applies(Wallet wallet, AnalyticsResponse analytics, List<WalletGoal> goals);
}
