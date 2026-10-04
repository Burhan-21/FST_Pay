package com.fstpay.parent.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class SetSpendingLimitRequest {
    private Boolean parentalControlEnabled;
    private BigDecimal maxTxnAmount;
    private BigDecimal dailyLimit;
    private BigDecimal weeklyLimit;
    private BigDecimal monthlyLimit;
    private String restrictedCategories;
    private String blockedMerchants;
}
