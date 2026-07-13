package com.fstpay.aicoach.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BudgetPlanningResponse {
    private BigDecimal totalIncome;
    private BigDecimal totalSpending;
    private Map<String, BigDecimal> recommendedAllocation; // Needs, Wants, Savings
    private Map<String, BigDecimal> actualAllocation;      // Needs, Wants, Savings
}
