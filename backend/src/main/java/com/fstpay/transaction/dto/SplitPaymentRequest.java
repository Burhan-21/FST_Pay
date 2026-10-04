package com.fstpay.transaction.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class SplitPaymentRequest {
    @NotNull(message = "Total amount is required")
    @DecimalMin(value = "1.00", message = "Minimum amount is ₹1.00")
    private BigDecimal totalAmount;

    @NotNull(message = "Split count is required")
    @Min(value = 2, message = "Split count must be at least 2")
    private Integer splitCount;

    private BigDecimal userShare;

    @NotBlank(message = "Merchant/recipient is required")
    private String merchant;

    private String category;

    private String note;

    private String currency;
}
