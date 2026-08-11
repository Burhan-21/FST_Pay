package com.fstpay.common.outbox;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@Slf4j
public class OutboxPublisher {

    private final OutboxEventRepository outboxEventRepository;
    private final OutboxProcessor outboxProcessor;
    private final MeterRegistry meterRegistry;

    private static final int MAX_RETRIES = 5;

    public OutboxPublisher(
            OutboxEventRepository outboxEventRepository,
            OutboxProcessor outboxProcessor,
            MeterRegistry meterRegistry
    ) {
        this.outboxEventRepository = outboxEventRepository;
        this.outboxProcessor = outboxProcessor;
        this.meterRegistry = meterRegistry;

        // Register Gauge metrics for outbox status inspection
        meterRegistry.gauge("fstpay.outbox.events.pending", this,
                p -> p.getEventsCountByStatus(OutboxStatus.PENDING));
        meterRegistry.gauge("fstpay.outbox.events.failed", this,
                p -> p.getEventsCountByStatus(OutboxStatus.FAILED));
        meterRegistry.gauge("fstpay.outbox.events.dead_letter", this,
                p -> p.getEventsCountByStatus(OutboxStatus.DEAD_LETTER));
        meterRegistry.gauge("fstpay.outbox.events.oldest_pending_age", this,
                p -> p.getOldestPendingAgeSeconds());
    }

    private double getEventsCountByStatus(OutboxStatus status) {
        try {
            return outboxEventRepository.countByStatus(status);
        } catch (Exception e) {
            return 0.0;
        }
    }

    private double getOldestPendingAgeSeconds() {
        try {
            List<UUID> oldestPendingIds = outboxEventRepository.findEventIdsToProcess(
                    List.of(OutboxStatus.PENDING, OutboxStatus.FAILED),
                    5,
                    PageRequest.of(0, 1)
            );
            if (!oldestPendingIds.isEmpty()) {
                OutboxEvent oldest = outboxEventRepository.findById(oldestPendingIds.get(0)).orElse(null);
                if (oldest != null) {
                    return java.time.temporal.ChronoUnit.SECONDS.between(oldest.getCreatedAt(), java.time.Instant.now());
                }
            }
            return 0.0;
        } catch (Exception e) {
            return 0.0;
        }
    }

    @Scheduled(fixedDelayString = "${app.outbox.publisher.delay-ms:1000}")
    public void publishPendingEvents() {
        try {
            // Retrieve candidate event IDs ordered by creation time
            List<UUID> eventIds = outboxEventRepository.findEventIdsToProcess(
                    List.of(OutboxStatus.PENDING, OutboxStatus.FAILED),
                    MAX_RETRIES,
                    PageRequest.of(0, 10)
            );

            for (UUID id : eventIds) {
                try {
                    outboxProcessor.process(id);
                } catch (Exception e) {
                    log.error("Outbox execution error for event ID: {}", id, e);
                }
            }
        } catch (Exception e) {
            log.error("Error during outbox scheduler execution loop", e);
        }
    }
}
