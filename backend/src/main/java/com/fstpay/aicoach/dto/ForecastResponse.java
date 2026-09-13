package com.fstpay.aicoach.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ForecastResponse {
    private List<ForecastPoint> points;
    private String modelUsed;
    private BigDecimal currentBalance;
    private BigDecimal dailyBurnMean;
    private BigDecimal dailyBurnStdDev;
    private Integer estimatedRunoutDays;
    private Double runoutProbability;
    private List<GoalFeasibility> goalFeasibilities;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ForecastPoint {
        private String label;
        private BigDecimal predictedCumulativeSpend;
        private BigDecimal medianBalance;
        private BigDecimal optimisticBalance;
        private BigDecimal pessimisticBalance;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GoalFeasibility {
        private UUID goalId;
        private String goalName;
        private BigDecimal targetAmount;
        private BigDecimal currentAmount;
        private LocalDate targetDate;
        private Double probabilityPercentage;
        private String status;
    }
}
