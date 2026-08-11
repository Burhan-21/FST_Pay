package com.fstpay.common.outbox;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.actuate.health.Status;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OutboxHealthIndicator implements HealthIndicator {

    private final OutboxEventRepository outboxEventRepository;
    private final OutboxProperties outboxProperties;

    @Override
    public Health health() {
        long stallThresholdSeconds = outboxProperties.getHealthStallThresholdSeconds();
        long pending = outboxEventRepository.countByStatus(OutboxStatus.PENDING);
        long failed = outboxEventRepository.countByStatus(OutboxStatus.FAILED);
        long deadLetter = outboxEventRepository.countByStatus(OutboxStatus.DEAD_LETTER);
        long oldestPendingAgeSeconds = 0;

        List<UUID> oldestPendingIds = outboxEventRepository.findEventIdsToProcess(
                List.of(OutboxStatus.PENDING, OutboxStatus.FAILED),
                5,
                org.springframework.data.domain.PageRequest.of(0, 1)
        );

        if (!oldestPendingIds.isEmpty()) {
            OutboxEvent oldest = outboxEventRepository.findById(oldestPendingIds.get(0)).orElse(null);
            if (oldest != null) {
                oldestPendingAgeSeconds = ChronoUnit.SECONDS.between(oldest.getCreatedAt(), Instant.now());
            }
        }

        Health.Builder builder = Health.up()
                .withDetail("pending", pending)
                .withDetail("failed", failed)
                .withDetail("deadLetter", deadLetter)
                .withDetail("oldestPendingAgeSeconds", oldestPendingAgeSeconds);

        if (oldestPendingAgeSeconds > stallThresholdSeconds) {
            builder.status(Status.DOWN)
                   .withDetail("message", "Outbox processing is stalled. Oldest pending event is " + oldestPendingAgeSeconds + " seconds old.");
        }

        return builder.build();
    }
}
