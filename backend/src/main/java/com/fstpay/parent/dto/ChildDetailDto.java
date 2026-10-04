package com.fstpay.parent.dto;

import com.fstpay.card.entity.VirtualCard;
import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.transaction.entity.Transaction;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ChildDetailDto {
    private UUID id;
    private String fullName;
    private String email;
    private String relationship;
    private Boolean parentalControlEnabled;
    private BigDecimal parentalMaxTxnAmount;
    private BigDecimal parentalDailyLimit;
    private BigDecimal parentalWeeklyLimit;
    private BigDecimal parentalMonthlyLimit;
    private String parentalRestrictedCategories;
    private String parentalBlockedMerchants;
    
    private BigDecimal walletBalance;
    private String walletCurrency;
    
    private List<VirtualCard> virtualCards;
    private List<WalletGoal> activeGoals;
    private List<Transaction> recentTransactions;
    private com.fstpay.analytics.dto.AnalyticsResponse analytics;
}
