package com.fstpay.goal.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoundUpRuleResponse {
    private boolean enabled;
    private UUID goalId;
    private String goalName;
    private Integer roundUpNearest;
    private BigDecimal accumulatedAmount;
    private BigDecimal currentGoalAmount;
    private BigDecimal targetGoalAmount;
}
