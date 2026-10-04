package com.fstpay.common.idempotency.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when an idempotency key conflict occurs:
 * - Concurrent duplicate request is currently executing
 * - Key reused with a different request payload
 * - Key reused across different endpoints or users
 * 
 * Author: Shaikh Mohammed Burhan
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class IdempotencyConflictException extends RuntimeException {

    public IdempotencyConflictException(String message) {
        super(message);
    }
}
