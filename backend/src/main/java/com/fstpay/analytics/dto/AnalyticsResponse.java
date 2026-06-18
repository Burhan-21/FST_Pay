package com.fstpay.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsResponse {
    private BigDecimal totalCredit;
    private BigDecimal totalDebit;
    private BigDecimal netSavings;
    private BigDecimal dailyAverageSpend;
    private Map<String, BigDecimal> spendByCategory;
}
