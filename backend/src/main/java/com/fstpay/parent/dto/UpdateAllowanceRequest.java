package com.fstpay.parent.dto;

import com.fstpay.parent.enums.AllowanceFrequency;
import jakarta.validation.constraints.DecimalMin;
import lombok.*;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAllowanceRequest {

    @DecimalMin(value = "1.00", message = "Allowance amount must be at least ₹1.00")
    private BigDecimal amount;

    private AllowanceFrequency frequency;

    private DayOfWeek dayOfWeek;

    private Integer dayOfMonth;

    private UUID targetGoalId;

    private String note;

    private Boolean active;
}
