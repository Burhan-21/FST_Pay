package com.fstpay.common.idempotency.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.idempotency.dto.IdempotencyCheckResult;
import com.fstpay.common.idempotency.dto.IdempotencyRecord;
import com.fstpay.common.idempotency.dto.IdempotencyStatus;
import com.fstpay.common.idempotency.exception.IdempotencyConflictException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Service managing distributed idempotency records in Redis with thread-safe in-memory fallback.
 * 
 * Author: Shaikh Mohammed Burhan
 */
@Slf4j
@Service
public class IdempotencyService {

    private static final String KEY_PREFIX = "idempotency:";
    private static final Pattern VALID_KEY_PATTERN = Pattern.compile("^[a-zA-Z0-9_\\-]{8,128}$");

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    // Resilient thread-safe local fallback if Redis is unavailable or unconfigured
    private final Map<String, IdempotencyRecord> localFallbackMap = new ConcurrentHashMap<>();

    public IdempotencyService(
            @Autowired(required = false) StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper
    ) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = (objectMapper != null ? objectMapper.copy() : new ObjectMapper())
                .findAndRegisterModules();
    }

    public void validateKeyFormat(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
            throw new BadRequestException("Idempotency-Key header cannot be empty");
        }
        String trimmed = idempotencyKey.trim();
        if (!VALID_KEY_PATTERN.matcher(trimmed).matches()) {
            throw new BadRequestException("Invalid Idempotency-Key format. Must be an alphanumeric string or UUID between 8 and 128 characters.");
        }
    }

    public IdempotencyCheckResult start(
            String userEmail,
            String idempotencyKey,
            String endpoint,
            String requestFingerprint,
            int lockTimeoutSeconds
    ) {
        validateKeyFormat(idempotencyKey);
        String fullKey = buildKey(userEmail, idempotencyKey);

        IdempotencyRecord pendingRecord = IdempotencyRecord.builder()
                .key(idempotencyKey)
                .userEmail(userEmail)
                .endpoint(endpoint)
                .requestFingerprint(requestFingerprint)
                .status(IdempotencyStatus.PENDING)
                .createdAt(Instant.now())
                .build();

        // 1. Try Redis first
        if (redisTemplate != null) {
            try {
                String pendingJson = objectMapper.writeValueAsString(pendingRecord);
                Boolean acquired = redisTemplate.opsForValue().setIfAbsent(
                        fullKey,
                        pendingJson,
                        Duration.ofSeconds(lockTimeoutSeconds)
                );

                if (Boolean.TRUE.equals(acquired)) {
                    log.debug("Acquired idempotency lock in Redis for key: {}", fullKey);
                    return IdempotencyCheckResult.acquired();
                }

                // Key already exists in Redis: inspect existing record
                String existingJson = redisTemplate.opsForValue().get(fullKey);
                if (existingJson != null) {
                    IdempotencyRecord existing = objectMapper.readValue(existingJson, IdempotencyRecord.class);
                    return handleExistingRecord(existing, userEmail, endpoint, requestFingerprint, idempotencyKey);
                }
            } catch (IdempotencyConflictException e) {
                throw e;
            } catch (Exception e) {
                log.warn("Redis error during idempotency check for key '{}'. Falling back to local cache: {}", fullKey, e.getMessage());
            }
        }

        // 2. Fallback to thread-safe local cache
        IdempotencyRecord existing = localFallbackMap.putIfAbsent(fullKey, pendingRecord);
        if (existing == null) {
            log.debug("Acquired idempotency lock in local fallback cache for key: {}", fullKey);
            return IdempotencyCheckResult.acquired();
        }

        return handleExistingRecord(existing, userEmail, endpoint, requestFingerprint, idempotencyKey);
    }

    private IdempotencyCheckResult handleExistingRecord(
            IdempotencyRecord existing,
            String userEmail,
            String endpoint,
            String requestFingerprint,
            String idempotencyKey
    ) {
        if (existing.getStatus() == IdempotencyStatus.PENDING) {
            throw new IdempotencyConflictException(
                    String.format("Concurrent request with idempotency key '%s' is currently processing. Please retry shortly.", idempotencyKey)
            );
        }

        if (existing.getStatus() == IdempotencyStatus.COMPLETED) {
            // Verify user ownership
            if (existing.getUserEmail() != null && !existing.getUserEmail().equalsIgnoreCase(userEmail)) {
                throw new IdempotencyConflictException(
                        String.format("Idempotency key '%s' was previously used by a different user account.", idempotencyKey)
                );
            }

            // Verify endpoint binding
            if (existing.getEndpoint() != null && !existing.getEndpoint().equalsIgnoreCase(endpoint)) {
                throw new IdempotencyConflictException(
                        String.format("Idempotency key '%s' was previously used for endpoint '%s', cannot be reused for '%s'.",
                                idempotencyKey, existing.getEndpoint(), endpoint)
                );
            }

            // Verify request fingerprint (amount, recipient, payload)
            if (existing.getRequestFingerprint() != null && !existing.getRequestFingerprint().equals(requestFingerprint)) {
                throw new IdempotencyConflictException(
                        String.format("Idempotency key conflict: Request payload does not match the original request for key '%s'.", idempotencyKey)
                );
            }

            log.info("Returning cached idempotent response for user '{}' on key '{}'", userEmail, idempotencyKey);
            return IdempotencyCheckResult.cached(existing);
        }

        // If status was FAILED, allow re-execution
        return IdempotencyCheckResult.acquired();
    }

    public void complete(
            String userEmail,
            String idempotencyKey,
            String endpoint,
            String requestFingerprint,
            int statusCode,
            String responseBodyJson,
            int expireSeconds
    ) {
        String fullKey = buildKey(userEmail, idempotencyKey);
        IdempotencyRecord completed = IdempotencyRecord.builder()
                .key(idempotencyKey)
                .userEmail(userEmail)
                .endpoint(endpoint)
                .requestFingerprint(requestFingerprint)
                .status(IdempotencyStatus.COMPLETED)
                .statusCode(statusCode)
                .responseBodyJson(responseBodyJson)
                .createdAt(Instant.now())
                .completedAt(Instant.now())
                .build();

        if (redisTemplate != null) {
            try {
                String completedJson = objectMapper.writeValueAsString(completed);
                redisTemplate.opsForValue().set(fullKey, completedJson, Duration.ofSeconds(expireSeconds));
                log.debug("Stored COMPLETED idempotency state in Redis for key: {}", fullKey);
                return;
            } catch (Exception e) {
                log.warn("Failed to store completed idempotency state in Redis for key '{}': {}", fullKey, e.getMessage());
            }
        }

        localFallbackMap.put(fullKey, completed);
        log.debug("Stored COMPLETED idempotency state in local cache for key: {}", fullKey);
    }

    public void fail(String userEmail, String idempotencyKey) {
        String fullKey = buildKey(userEmail, idempotencyKey);
        if (redisTemplate != null) {
            try {
                redisTemplate.delete(fullKey);
                log.debug("Cleaned up failed/aborted idempotency key in Redis: {}", fullKey);
            } catch (Exception e) {
                log.warn("Failed to delete idempotency key from Redis for key '{}': {}", fullKey, e.getMessage());
            }
        }
        localFallbackMap.remove(fullKey);
    }

    private String buildKey(String userEmail, String idempotencyKey) {
        return KEY_PREFIX + idempotencyKey.trim();
    }
}
