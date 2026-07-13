package com.fstpay.goal.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoalCreateRequest {

    @NotBlank(message = "Goal name is required")
    private String name;

    private String description;

    @NotNull(message = "Target amount is required")
    @Min(value = 1, message = "Target amount must be at least 1")
    private BigDecimal targetAmount;

    @NotNull(message = "Target date is required")
    @FutureOrPresent(message = "Target date cannot be in the past")
    private LocalDate targetDate;

    private String priority; // LOW, MEDIUM, HIGH

    private String icon;

    private String color;
}
