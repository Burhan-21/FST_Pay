package com.fstpay.transaction.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class SimulateSpendRequest {
    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1.00", message = "Minimum spend amount is ₹1.00")
    private BigDecimal amount;

    @NotBlank(message = "Category is required")
    private String category; // FOOD, SHOPPING, etc.

    @NotBlank(message = "Merchant name is required")
    private String merchant;

    private String description;
}
