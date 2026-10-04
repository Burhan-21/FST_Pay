package com.fstpay.common.idempotency.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;

/**
 * Data model for storing idempotency state and cached response payload.
 * 
 * Author: Shaikh Mohammed Burhan
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IdempotencyRecord implements Serializable {

    private String key;
    private String userEmail;
    private String endpoint;
    private String requestFingerprint;
    private IdempotencyStatus status;
    private Integer statusCode;
    private String responseBodyJson;
    private Instant createdAt;
    private Instant completedAt;
}
