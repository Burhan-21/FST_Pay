package com.fstpay.common.idempotency;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.idempotency.dto.IdempotencyCheckResult;
import com.fstpay.common.idempotency.dto.IdempotencyStatus;
import com.fstpay.common.idempotency.exception.IdempotencyConflictException;
import com.fstpay.common.idempotency.service.IdempotencyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IdempotencyServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private ObjectMapper objectMapper;
    private IdempotencyService idempotencyServiceWithRedis;
    private IdempotencyService idempotencyServiceInMemory;

    private final String userEmail = "testuser@fstpay.com";
    private final String key = "123e4567-e89b-12d3-a456-426614174000";
    private final String endpoint = "POST /api/v1/wallet/topup";
    private final String fingerprint = "hash_amount_1000";

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        idempotencyServiceInMemory = new IdempotencyService(null, objectMapper);
    }

    @Test
    @DisplayName("Invalid key formats (too short, empty, invalid chars) are rejected with BadRequestException")
    void testInvalidKeyFormats() {
        assertThrows(BadRequestException.class, () -> idempotencyServiceInMemory.validateKeyFormat(""));
        assertThrows(BadRequestException.class, () -> idempotencyServiceInMemory.validateKeyFormat("short"));
        assertThrows(BadRequestException.class, () -> idempotencyServiceInMemory.validateKeyFormat("key with spaces!"));
    }

    @Test
    @DisplayName("Valid key is accepted")
    void testValidKeyFormat() {
        assertDoesNotThrow(() -> idempotencyServiceInMemory.validateKeyFormat(key));
        assertDoesNotThrow(() -> idempotencyServiceInMemory.validateKeyFormat("custom-idemp-key-999"));
    }

    @Test
    @DisplayName("In-Memory: First request acquires lock, second exact request returns cached COMPLETED result")
    void testSuccessfulFirstRequestAndExactRetry_InMemory() {
        // 1. First request acquires lock
        IdempotencyCheckResult first = idempotencyServiceInMemory.start(userEmail, key, endpoint, fingerprint, 60);
        assertFalse(first.isCached(), "First request should acquire new lock, not be cached");

        // Complete the operation
        idempotencyServiceInMemory.complete(userEmail, key, endpoint, fingerprint, 200, "{\"success\":true}", 86400);

        // 2. Exact retry with same key, endpoint, fingerprint
        IdempotencyCheckResult retry = idempotencyServiceInMemory.start(userEmail, key, endpoint, fingerprint, 60);
        assertTrue(retry.isCached(), "Exact retry should be detected as cached");
        assertNotNull(retry.getRecord());
        assertEquals(IdempotencyStatus.COMPLETED, retry.getRecord().getStatus());
        assertEquals(200, retry.getRecord().getStatusCode());
        assertEquals("{\"success\":true}", retry.getRecord().getResponseBodyJson());
    }

    @Test
    @DisplayName("In-Memory: Concurrent duplicate request while PENDING throws IdempotencyConflictException")
    void testConcurrentDuplicateRequestRejected_InMemory() {
        // First request is processing (PENDING)
        IdempotencyCheckResult first = idempotencyServiceInMemory.start(userEmail, key, endpoint, fingerprint, 60);
        assertFalse(first.isCached());

        // Concurrent duplicate request with same key
        IdempotencyConflictException ex = assertThrows(IdempotencyConflictException.class, () ->
                idempotencyServiceInMemory.start(userEmail, key, endpoint, fingerprint, 60));

        assertTrue(ex.getMessage().contains("currently processing"));
    }

    @Test
    @DisplayName("In-Memory: Reusing key with different request payload fingerprint throws conflict exception")
    void testReusedKeyWithDifferentPayloadRejected_InMemory() {
        // First request completed with ₹1000
        idempotencyServiceInMemory.start(userEmail, key, endpoint, fingerprint, 60);
        idempotencyServiceInMemory.complete(userEmail, key, endpoint, fingerprint, 200, "{\"amount\":1000}", 86400);

        // Second request with same key but different payload (₹2000)
        String differentFingerprint = "hash_amount_2000";
        IdempotencyConflictException ex = assertThrows(IdempotencyConflictException.class, () ->
                idempotencyServiceInMemory.start(userEmail, key, endpoint, differentFingerprint, 60));

        assertTrue(ex.getMessage().contains("Request payload does not match"));
    }

    @Test
    @DisplayName("In-Memory: Reusing key on a different endpoint throws conflict exception")
    void testReusedKeyWithDifferentEndpointRejected_InMemory() {
        idempotencyServiceInMemory.start(userEmail, key, endpoint, fingerprint, 60);
        idempotencyServiceInMemory.complete(userEmail, key, endpoint, fingerprint, 200, "{}", 86400);

        String differentEndpoint = "POST /api/v1/wallet/withdraw";
        IdempotencyConflictException ex = assertThrows(IdempotencyConflictException.class, () ->
                idempotencyServiceInMemory.start(userEmail, key, differentEndpoint, fingerprint, 60));

        assertTrue(ex.getMessage().contains("cannot be reused for"));
    }

    @Test
    @DisplayName("In-Memory: Reusing key across different user accounts throws conflict exception")
    void testReusedKeyWithDifferentUserRejected_InMemory() {
        idempotencyServiceInMemory.start(userEmail, key, endpoint, fingerprint, 60);
        idempotencyServiceInMemory.complete(userEmail, key, endpoint, fingerprint, 200, "{}", 86400);

        String otherUser = "otheruser@fstpay.com";
        // Attempting to reuse with different user
        IdempotencyConflictException ex = assertThrows(IdempotencyConflictException.class, () ->
                idempotencyServiceInMemory.start(otherUser, key, endpoint, fingerprint, 60));

        assertTrue(ex.getMessage().contains("different user account") || ex.getMessage().contains("cannot be reused"));
    }

    @Test
    @DisplayName("In-Memory: Failed transaction cleans up key, allowing subsequent retry to proceed")
    void testFailedTransactionCleansUpLock_InMemory() {
        idempotencyServiceInMemory.start(userEmail, key, endpoint, fingerprint, 60);
        // Simulation of failure / exception
        idempotencyServiceInMemory.fail(userEmail, key);

        // Subsequent retry should acquire lock cleanly
        IdempotencyCheckResult retry = idempotencyServiceInMemory.start(userEmail, key, endpoint, fingerprint, 60);
        assertFalse(retry.isCached(), "After failure cleanup, lock should be re-acquirable");
    }

    @Test
    @DisplayName("Redis: Successfully acquires lock and reads cached response")
    void testRedisIdempotencyFlow() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        idempotencyServiceWithRedis = new IdempotencyService(redisTemplate, objectMapper);

        // 1. Acquire lock in Redis
        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);
        IdempotencyCheckResult first = idempotencyServiceWithRedis.start(userEmail, key, endpoint, fingerprint, 60);
        assertFalse(first.isCached());

        // 2. Complete operation
        idempotencyServiceWithRedis.complete(userEmail, key, endpoint, fingerprint, 200, "{\"success\":true}", 86400);
        verify(valueOperations).set(anyString(), anyString(), any(Duration.class));

        // 3. Retry when key already exists in Redis
        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(false);
        String cachedJson = String.format("{\"key\":\"%s\",\"userEmail\":\"%s\",\"endpoint\":\"%s\",\"requestFingerprint\":\"%s\",\"status\":\"COMPLETED\",\"statusCode\":200,\"responseBodyJson\":\"{\\\"success\\\":true}\"}",
                key, userEmail, endpoint, fingerprint);
        when(valueOperations.get(anyString())).thenReturn(cachedJson);

        IdempotencyCheckResult retry = idempotencyServiceWithRedis.start(userEmail, key, endpoint, fingerprint, 60);
        assertTrue(retry.isCached());
        assertEquals(200, retry.getRecord().getStatusCode());
    }

    @Test
    @DisplayName("Redis Failure: Falls back gracefully to local cache without crashing")
    void testRedisFailureFallback() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class)))
                .thenThrow(new org.springframework.data.redis.RedisConnectionFailureException("Connection refused"));

        idempotencyServiceWithRedis = new IdempotencyService(redisTemplate, objectMapper);

        // Should not throw connection exception; gracefully falls back to in-memory
        IdempotencyCheckResult result = assertDoesNotThrow(() ->
                idempotencyServiceWithRedis.start(userEmail, key, endpoint, fingerprint, 60));

        assertFalse(result.isCached(), "Fallback cache should successfully acquire lock");
    }
}
