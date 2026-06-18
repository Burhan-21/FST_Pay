package com.fstpay.card.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class UpdateLimitRequest {
    @NotNull(message = "Spending limit is required")
    @DecimalMin(value = "0.00", message = "Limit must be at least ₹0.00")
    private BigDecimal spendingLimit;

    @NotNull(message = "Daily limit is required")
    @DecimalMin(value = "0.00", message = "Limit must be at least ₹0.00")
    private BigDecimal dailyLimit;
}
