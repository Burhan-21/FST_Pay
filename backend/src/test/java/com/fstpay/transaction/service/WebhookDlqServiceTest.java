package com.fstpay.transaction.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fstpay.transaction.dto.MerchantSettlementResponse;
import com.fstpay.transaction.dto.MerchantSettlementWebhookRequest;
import com.fstpay.transaction.entity.WebhookDlq;
import com.fstpay.transaction.repository.WebhookDlqRepository;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WebhookDlqServiceTest {

    @Mock
    private WebhookDlqRepository dlqRepository;
    @Mock
    private MerchantSettlementService settlementService;

    private CircuitBreaker circuitBreaker;
    private ObjectMapper objectMapper;
    private SimpleMeterRegistry meterRegistry;
    private WebhookDlqService dlqService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        meterRegistry = new SimpleMeterRegistry();
        circuitBreaker = CircuitBreakerRegistry.of(CircuitBreakerConfig.ofDefaults())
                .circuitBreaker("merchantSettlement");

        dlqService = new WebhookDlqService(
                dlqRepository, settlementService, circuitBreaker, objectMapper, meterRegistry
        );
    }

    private MerchantSettlementWebhookRequest createRequest() {
        return MerchantSettlementWebhookRequest.builder()
                .referenceId("REF-12345")
                .merchantId("MERCH-001")
                .settlementAmount(new BigDecimal("150.00"))
                .status("SETTLED")
                .build();
    }

    @Test
    void queueFailedWebhook_CreatesDlqWithInitialRetry() {
        MerchantSettlementWebhookRequest request = createRequest();

        when(dlqRepository.save(any(WebhookDlq.class))).thenAnswer(i -> {
            WebhookDlq d = i.getArgument(0);
            d.setId(UUID.randomUUID());
            return d;
        });

        WebhookDlq dlq = dlqService.queueFailedWebhook(request, "Connection timeout", false);

        assertNotNull(dlq);
        assertEquals("REF-12345", dlq.getReferenceId());
        assertEquals("MERCH-001", dlq.getMerchantId());
        assertEquals(new BigDecimal("150.00"), dlq.getAmount());
        assertEquals("PENDING_RETRY", dlq.getStatus());
        assertEquals(0, dlq.getRetryCount());
        assertFalse(dlq.getCircuitBreakerTripped());
        assertNotNull(dlq.getNextRetryAt());
        assertTrue(dlq.getNextRetryAt().isAfter(Instant.now()));

        verify(dlqRepository).save(any(WebhookDlq.class));
    }

    @Test
    void calculateNextRetry_FollowsExponentialBackoff() {
        Instant now = Instant.now();
        Instant retry0 = dlqService.calculateNextRetry(0);
        Instant retry1 = dlqService.calculateNextRetry(1);
        Instant retry2 = dlqService.calculateNextRetry(2);
        Instant retry3 = dlqService.calculateNextRetry(3);
        Instant retry4 = dlqService.calculateNextRetry(4);
        Instant retry5 = dlqService.calculateNextRetry(5);

        assertNotNull(retry0);
        assertNotNull(retry1);
        assertNotNull(retry2);
        assertNotNull(retry3);
        assertNotNull(retry4);
        assertNull(retry5); // Exhausted

        assertTrue(retry1.isAfter(retry0));
        assertTrue(retry2.isAfter(retry1));
        assertTrue(retry3.isAfter(retry2));
        assertTrue(retry4.isAfter(retry3));
    }

    @Test
    void reprocessEntry_WhenSuccessful_MarksResolved() throws Exception {
        MerchantSettlementWebhookRequest request = createRequest();
        String json = objectMapper.writeValueAsString(request);

        WebhookDlq dlq = WebhookDlq.builder()
                .id(UUID.randomUUID())
                .referenceId("REF-12345")
                .payload(json)
                .status("PENDING_RETRY")
                .retryCount(1)
                .maxRetries(5)
                .build();

        MerchantSettlementResponse resp = MerchantSettlementResponse.builder()
                .status("SUCCESS")
                .referenceId("REF-12345")
                .settlementStatus("SETTLED")
                .build();

        when(settlementService.processSettlement(any(MerchantSettlementWebhookRequest.class))).thenReturn(resp);
        when(dlqRepository.save(any(WebhookDlq.class))).thenAnswer(i -> i.getArgument(0));

        boolean success = dlqService.reprocessEntry(dlq);

        assertTrue(success);
        assertEquals("RESOLVED", dlq.getStatus());
        assertNotNull(dlq.getResolvedAt());
        assertNull(dlq.getNextRetryAt());
        verify(dlqRepository).save(dlq);
    }

    @Test
    void reprocessEntry_WhenFailsExhaustingRetries_MarksDeadLetter() throws Exception {
        MerchantSettlementWebhookRequest request = createRequest();
        String json = objectMapper.writeValueAsString(request);

        WebhookDlq dlq = WebhookDlq.builder()
                .id(UUID.randomUUID())
                .referenceId("REF-12345")
                .payload(json)
                .status("PENDING_RETRY")
                .retryCount(4) // 5th attempt will exhaust maxRetries=5
                .maxRetries(5)
                .build();

        when(settlementService.processSettlement(any(MerchantSettlementWebhookRequest.class)))
                .thenThrow(new RuntimeException("Database offline"));
        when(dlqRepository.save(any(WebhookDlq.class))).thenAnswer(i -> i.getArgument(0));

        boolean success = dlqService.reprocessEntry(dlq);

        assertFalse(success);
        assertEquals(5, dlq.getRetryCount());
        assertEquals("DEAD_LETTER", dlq.getStatus());
        assertNull(dlq.getNextRetryAt());
        assertEquals("Database offline", dlq.getErrorMessage());
    }

    @Test
    void discardWebhook_MarksDiscarded() {
        UUID id = UUID.randomUUID();
        WebhookDlq dlq = WebhookDlq.builder()
                .id(id)
                .referenceId("REF-DISCARD")
                .status("DEAD_LETTER")
                .build();

        when(dlqRepository.findById(id)).thenReturn(Optional.of(dlq));
        when(dlqRepository.save(any(WebhookDlq.class))).thenAnswer(i -> i.getArgument(0));

        dlqService.discardWebhook(id);

        assertEquals("DISCARDED", dlq.getStatus());
        assertNull(dlq.getNextRetryAt());
    }

    @Test
    void getCircuitBreakerStatus_ReturnsLiveStatus() {
        var status = dlqService.getCircuitBreakerStatus();
        assertNotNull(status);
        assertEquals("merchantSettlement", status.getName());
        assertEquals("CLOSED", status.getState());

        dlqService.resetCircuitBreaker();
        assertEquals("CLOSED", dlqService.getCircuitBreakerStatus().getState());
    }
}
