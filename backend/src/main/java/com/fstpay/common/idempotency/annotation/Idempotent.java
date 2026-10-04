package com.fstpay.common.idempotency.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a controller endpoint as idempotent, protected by the Idempotency-Key HTTP header.
 * 
 * Author: Shaikh Mohammed Burhan
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Idempotent {

    /**
     * Cache retention TTL in seconds once operation is COMPLETED.
     * Default: 86400 (24 hours).
     */
    int expireSeconds() default 86400;

    /**
     * Whether the Idempotency-Key header is strictly required on this endpoint.
     * If false, requests without the header execute normally without idempotency caching.
     * Default: false.
     */
    boolean required() default false;

    /**
     * Lock timeout in seconds for requests in PENDING state.
     * Default: 60 seconds.
     */
    int lockTimeoutSeconds() default 60;
}
