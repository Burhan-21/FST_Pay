package com.fstpay.admin.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class AdminStatsResponse {
    private long totalUsers;
    private long activeCards;
    private BigDecimal totalWalletBalance;
    private long totalTransactions;
    private BigDecimal totalVolume;
}
