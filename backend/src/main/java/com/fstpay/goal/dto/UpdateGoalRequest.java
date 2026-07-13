package com.fstpay.goal.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateGoalRequest {
    private String name;
    private String description;
    private BigDecimal targetAmount;
    private LocalDate targetDate;
    private String priority;
    private String icon;
    private String color;
    private String status;
}
