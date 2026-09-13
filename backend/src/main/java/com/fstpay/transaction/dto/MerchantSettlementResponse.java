package com.fstpay.transaction.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MerchantSettlementResponse {
    private String status; // SUCCESS, IGNORED_DUPLICATE
    private UUID transactionId;
    private String referenceId;
    private String settlementStatus;
    private String message;
    private Instant processedAt;
}
