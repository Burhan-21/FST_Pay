package com.fstpay.transaction.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "webhook_dlq")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookDlq {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "webhook_type", nullable = false, length = 50)
    @Builder.Default
    private String webhookType = "MERCHANT_SETTLEMENT";

    @Column(name = "reference_id", nullable = false, length = 100)
    private String referenceId;

    @Column(name = "merchant_id", length = 100)
    private String merchantId;

    @Column(precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private Integer retryCount = 0;

    @Column(name = "max_retries", nullable = false)
    @Builder.Default
    private Integer maxRetries = 5;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING_RETRY";

    @Column(name = "circuit_breaker_tripped", nullable = false)
    @Builder.Default
    private Boolean circuitBreakerTripped = false;

    @Column(name = "next_retry_at")
    private Instant nextRetryAt;

    @Column(name = "last_attempted_at")
    private Instant lastAttemptedAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
