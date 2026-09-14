package com.fstpay.transaction.dto;

import com.fstpay.transaction.entity.WebhookDlq;
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
public class WebhookDlqDto {

    private UUID id;
    private String webhookType;
    private String referenceId;
    private String merchantId;
    private BigDecimal amount;
    private String payload;
    private String errorMessage;
    private Integer retryCount;
    private Integer maxRetries;
    private String status;
    private Boolean circuitBreakerTripped;
    private Instant nextRetryAt;
    private Instant lastAttemptedAt;
    private Instant resolvedAt;
    private Instant createdAt;
    private Instant updatedAt;

    public static WebhookDlqDto fromEntity(WebhookDlq entity) {
        return WebhookDlqDto.builder()
                .id(entity.getId())
                .webhookType(entity.getWebhookType())
                .referenceId(entity.getReferenceId())
                .merchantId(entity.getMerchantId())
                .amount(entity.getAmount())
                .payload(entity.getPayload())
                .errorMessage(entity.getErrorMessage())
                .retryCount(entity.getRetryCount())
                .maxRetries(entity.getMaxRetries())
                .status(entity.getStatus())
                .circuitBreakerTripped(entity.getCircuitBreakerTripped())
                .nextRetryAt(entity.getNextRetryAt())
                .lastAttemptedAt(entity.getLastAttemptedAt())
                .resolvedAt(entity.getResolvedAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
