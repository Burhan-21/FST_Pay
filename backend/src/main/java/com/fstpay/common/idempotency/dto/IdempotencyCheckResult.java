package com.fstpay.common.idempotency.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Result of checking whether an idempotency key is already cached or newly acquired.
 * 
 * Author: Shaikh Mohammed Burhan
 */
@Getter
@AllArgsConstructor
public class IdempotencyCheckResult {

    private final boolean cached;
    private final IdempotencyRecord record;

    public static IdempotencyCheckResult acquired() {
        return new IdempotencyCheckResult(false, null);
    }

    public static IdempotencyCheckResult cached(IdempotencyRecord record) {
        return new IdempotencyCheckResult(true, record);
    }
}
