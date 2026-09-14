package com.fstpay.transaction.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.transaction.dto.CircuitBreakerStatusDto;
import com.fstpay.transaction.dto.MerchantSettlementResponse;
import com.fstpay.transaction.dto.MerchantSettlementWebhookRequest;
import com.fstpay.transaction.dto.WebhookDlqDto;
import com.fstpay.transaction.entity.WebhookDlq;
import com.fstpay.transaction.repository.WebhookDlqRepository;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
public class WebhookDlqService {

    private final WebhookDlqRepository dlqRepository;
    private final MerchantSettlementService settlementService;
    private final CircuitBreaker circuitBreaker;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    @Autowired
    public WebhookDlqService(
            WebhookDlqRepository dlqRepository,
            MerchantSettlementService settlementService,
            @Qualifier("merchantSettlementCircuitBreaker") CircuitBreaker circuitBreaker,
            ObjectMapper objectMapper,
            @Autowired(required = false) MeterRegistry meterRegistry
    ) {
        this.dlqRepository = dlqRepository;
        this.settlementService = settlementService;
        this.circuitBreaker = circuitBreaker;
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
    }

    /**
     * Store failed or circuit-breaker rejected webhook into DLQ with initial retry timestamp.
     */
    @Transactional
    public WebhookDlq queueFailedWebhook(
            MerchantSettlementWebhookRequest request,
            String errorMessage,
            boolean circuitBreakerTripped
    ) {
        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(request);
        } catch (Exception e) {
            payloadJson = String.format("{\"referenceId\":\"%s\",\"amount\":%s}", request.getReferenceId(), request.getSettlementAmount());
        }

        Instant nextRetry = Instant.now().plus(Duration.ofSeconds(15));

        WebhookDlq dlq = WebhookDlq.builder()
                .webhookType("MERCHANT_SETTLEMENT")
                .referenceId(request.getReferenceId())
                .merchantId(request.getMerchantId())
                .amount(request.getSettlementAmount())
                .payload(payloadJson)
                .errorMessage(errorMessage)
                .retryCount(0)
                .maxRetries(5)
                .status("PENDING_RETRY")
                .circuitBreakerTripped(circuitBreakerTripped)
                .nextRetryAt(nextRetry)
                .lastAttemptedAt(Instant.now())
                .build();

        WebhookDlq saved = dlqRepository.save(dlq);
        log.warn("Queued webhook {} into DLQ. Next retry at {}. Reason: {}",
                saved.getReferenceId(), nextRetry, errorMessage);

        if (meterRegistry != null) {
            try {
                Counter.builder("fstpay.webhooks.dlq.queued.total")
                        .tag("circuit_breaker_tripped", String.valueOf(circuitBreakerTripped))
                        .register(meterRegistry)
                        .increment();
            } catch (Exception ignored) {}
        }

        return saved;
    }

    /**
     * Calculate exponential backoff duration based on retry attempt.
     */
    public Instant calculateNextRetry(int currentRetries) {
        long seconds;
        switch (currentRetries) {
            case 0:
                seconds = 15;      // 1st retry: +15s
                break;
            case 1:
                seconds = 45;      // 2nd retry: +45s
                break;
            case 2:
                seconds = 120;     // 3rd retry: +2m
                break;
            case 3:
                seconds = 600;     // 4th retry: +10m
                break;
            case 4:
                seconds = 1800;    // 5th retry: +30m
                break;
            default:
                return null;       // Exhausted -> DEAD_LETTER
        }
        return Instant.now().plus(Duration.ofSeconds(seconds));
    }

    /**
     * Reprocess a single DLQ item.
     */
    @Transactional
    public boolean reprocessEntry(WebhookDlq dlq) {
        log.info("Attempting to reprocess DLQ webhook: id={}, reference={}", dlq.getId(), dlq.getReferenceId());

        try {
            MerchantSettlementWebhookRequest request = objectMapper.readValue(dlq.getPayload(), MerchantSettlementWebhookRequest.class);
            MerchantSettlementResponse response = settlementService.processSettlement(request);

            dlq.setStatus("RESOLVED");
            dlq.setResolvedAt(Instant.now());
            dlq.setErrorMessage(null);
            dlq.setNextRetryAt(null);
            dlqRepository.save(dlq);

            log.info("Successfully resolved DLQ webhook {} with settlement status {}", dlq.getReferenceId(), response.getStatus());

            if (meterRegistry != null) {
                try {
                    Counter.builder("fstpay.webhooks.dlq.replayed.total")
                            .tag("status", "success")
                            .register(meterRegistry)
                            .increment();
                } catch (Exception ignored) {}
            }
            return true;
        } catch (Exception ex) {
            int newRetryCount = dlq.getRetryCount() + 1;
            dlq.setRetryCount(newRetryCount);
            dlq.setLastAttemptedAt(Instant.now());
            dlq.setErrorMessage(ex.getMessage());

            if (newRetryCount >= dlq.getMaxRetries()) {
                dlq.setStatus("DEAD_LETTER");
                dlq.setNextRetryAt(null);
                log.error("Exhausted max retries ({}) for DLQ webhook {}. Moved to DEAD_LETTER.",
                        dlq.getMaxRetries(), dlq.getReferenceId());
                if (meterRegistry != null) {
                    try {
                        Counter.builder("fstpay.webhooks.dlq.deadletter.total").register(meterRegistry).increment();
                    } catch (Exception ignored) {}
                }
            } else {
                Instant nextRetry = calculateNextRetry(newRetryCount);
                dlq.setNextRetryAt(nextRetry);
                dlq.setStatus("PENDING_RETRY");
                log.warn("Reprocessing failed for DLQ webhook {}. Attempt {}/{}. Next retry at {}",
                        dlq.getReferenceId(), newRetryCount, dlq.getMaxRetries(), nextRetry);
            }

            dlqRepository.save(dlq);

            if (meterRegistry != null) {
                try {
                    Counter.builder("fstpay.webhooks.dlq.replayed.total")
                            .tag("status", "failure")
                            .register(meterRegistry)
                            .increment();
                } catch (Exception ignored) {}
            }
            return false;
        }
    }

    /**
     * Manually replay a specific DLQ webhook by ID.
     */
    public boolean replayWebhook(UUID id) {
        WebhookDlq dlq = dlqRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DLQ webhook not found: " + id));
        return reprocessEntry(dlq);
    }

    /**
     * Bulk replay all eligible PENDING_RETRY and DEAD_LETTER entries.
     */
    public Map<String, Integer> replayAll() {
        List<WebhookDlq> eligible = dlqRepository.findAllEligibleForReplay();
        int successCount = 0;
        int failureCount = 0;

        for (WebhookDlq dlq : eligible) {
            boolean success = reprocessEntry(dlq);
            if (success) {
                successCount++;
            } else {
                failureCount++;
            }
        }

        Map<String, Integer> result = new HashMap<>();
        result.put("replayed", eligible.size());
        result.put("succeeded", successCount);
        result.put("failed", failureCount);
        return result;
    }

    /**
     * Discard an unrecoverable webhook from the DLQ.
     */
    @Transactional
    public void discardWebhook(UUID id) {
        WebhookDlq dlq = dlqRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DLQ webhook not found: " + id));
        dlq.setStatus("DISCARDED");
        dlq.setNextRetryAt(null);
        dlqRepository.save(dlq);
        log.info("Discarded DLQ webhook {}", id);
    }

    /**
     * Retrieve paginated DLQ entries.
     */
    public Page<WebhookDlqDto> getDlqEntries(String status, Pageable pageable) {
        Page<WebhookDlq> page;
        if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) {
            page = dlqRepository.findAll(pageable);
        } else {
            page = dlqRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase(), pageable);
        }
        return page.map(WebhookDlqDto::fromEntity);
    }

    /**
     * Retrieve current Circuit Breaker state and metrics.
     */
    public CircuitBreakerStatusDto getCircuitBreakerStatus() {
        CircuitBreaker.Metrics metrics = circuitBreaker.getMetrics();
        return CircuitBreakerStatusDto.builder()
                .name(circuitBreaker.getName())
                .state(circuitBreaker.getState().name())
                .failureRate(metrics.getFailureRate())
                .slowCallRate(metrics.getSlowCallRate())
                .numberOfBufferedCalls(metrics.getNumberOfBufferedCalls())
                .numberOfFailedCalls(metrics.getNumberOfFailedCalls())
                .numberOfSuccessfulCalls(metrics.getNumberOfSuccessfulCalls())
                .numberOfSlowCalls(metrics.getNumberOfSlowCalls())
                .numberOfNotPermittedCalls(metrics.getNumberOfNotPermittedCalls())
                .build();
    }

    /**
     * Manually reset the circuit breaker back to CLOSED.
     */
    public void resetCircuitBreaker() {
        circuitBreaker.reset();
        log.info("Circuit breaker {} reset to CLOSED state", circuitBreaker.getName());
    }
}
