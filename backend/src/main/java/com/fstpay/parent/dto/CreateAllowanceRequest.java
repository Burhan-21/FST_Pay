package com.fstpay.parent.dto;

import com.fstpay.parent.enums.AllowanceFrequency;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAllowanceRequest {

    @NotNull(message = "Child ID is required")
    private UUID childId;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1.00", message = "Allowance amount must be at least ₹1.00")
    private BigDecimal amount;

    @NotNull(message = "Frequency is required")
    private AllowanceFrequency frequency;

    private DayOfWeek dayOfWeek;

    private Integer dayOfMonth;

    private UUID targetGoalId;

    private String note;
}
