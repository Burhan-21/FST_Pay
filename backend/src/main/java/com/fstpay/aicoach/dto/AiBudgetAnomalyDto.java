package com.fstpay.aicoach.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiBudgetAnomalyDto {
    private String anomalyType;    // CATEGORY_SPIKE, WANTS_IMBALANCE, GOAL_AT_RISK, BURN_RATE_RISK
    private String severity;       // ALERT, WARNING, INFO
    private String category;       // FOOD, SHOPPING, GENERAL, etc.
    private BigDecimal currentAmount;
    private BigDecimal baselineAmount;
    private String title;
    private String message;
    private String actionableAdvice;
    private Instant detectedAt;
}
