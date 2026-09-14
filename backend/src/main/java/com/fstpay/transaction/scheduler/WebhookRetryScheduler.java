package com.fstpay.transaction.scheduler;

import com.fstpay.transaction.entity.WebhookDlq;
import com.fstpay.transaction.repository.WebhookDlqRepository;
import com.fstpay.transaction.service.WebhookDlqService;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.webhooks.retry.enabled", havingValue = "true", matchIfMissing = true)
public class WebhookRetryScheduler {

    private final WebhookDlqRepository dlqRepository;
    private final WebhookDlqService dlqService;
    @Qualifier("merchantSettlementCircuitBreaker")
    private final CircuitBreaker circuitBreaker;

    @Scheduled(fixedDelayString = "${app.webhooks.retry.interval-ms:15000}")
    public void processPendingRetries() {
        if (circuitBreaker.getState() == CircuitBreaker.State.OPEN) {
            log.warn("Webhook retry scheduler paused: Circuit breaker is OPEN.");
            return;
        }

        List<WebhookDlq> eligible = dlqRepository.findEligibleForRetry(Instant.now(), PageRequest.of(0, 20));
        if (eligible.isEmpty()) {
            return;
        }

        log.info("Processing {} pending webhook retries from DLQ...", eligible.size());
        for (WebhookDlq dlq : eligible) {
            dlqService.reprocessEntry(dlq);
        }
    }
}
