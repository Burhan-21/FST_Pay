package com.fstpay.common.idempotency.dto;

/**
 * Lifecycle states for an idempotent financial request.
 * 
 * Author: Shaikh Mohammed Burhan
 */
public enum IdempotencyStatus {
    PENDING,
    COMPLETED,
    FAILED
}
