package com.fstpay.parent.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class PocketMoneyRequest {
    @NotNull(message = "Child ID is required")
    private UUID childId;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1.00", message = "Pocket money amount must be at least ₹1.00")
    private BigDecimal amount;

    private String note;
}
