package com.fstpay.aicoach.dto;

import lombok.*;

import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HealthScoreResponse {
    private int score; // 0 - 100
    private String rating; // POOR, FAIR, GOOD, EXCELLENT
    private String description;
    private Map<String, Integer> breakdown; // savingsRate, expenseRatio, budgetAdherence, streak, goalsProgress, consistency
}
