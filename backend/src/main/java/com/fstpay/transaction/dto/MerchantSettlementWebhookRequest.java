package com.fstpay.transaction.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MerchantSettlementWebhookRequest {

    private UUID transactionId;

    @NotBlank(message = "Reference ID is required")
    private String referenceId;

    @NotBlank(message = "Merchant ID is required")
    private String merchantId;

    @NotNull(message = "Settlement amount is required")
    @Positive(message = "Settlement amount must be positive")
    private BigDecimal settlementAmount;

    @NotBlank(message = "Currency is required")
    private String currency;

    @NotBlank(message = "Settlement status is required")
    private String status; // SETTLED, FAILED, DISPUTED

    private Instant settledAt;

    private String settlementNote;
}
