package com.fstpay.common.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AiBudgetAnomalyEvent(
        EventMetadata metadata,
        UUID userId,
        String userEmail,
        String anomalyType,
        String category,
        String severity,
        BigDecimal currentAmount,
        BigDecimal baselineAmount,
        String title,
        String message,
        String actionableAdvice,
        Instant detectedAt
) implements DomainEvent {

    public static AiBudgetAnomalyEvent create(
            UUID userId,
            String userEmail,
            String anomalyType,
            String category,
            String severity,
            BigDecimal currentAmount,
            BigDecimal baselineAmount,
            String title,
            String message,
            String actionableAdvice,
            Instant detectedAt
    ) {
        return new AiBudgetAnomalyEvent(
                EventMetadata.create("AiBudgetAnomalyEvent", userId.toString()),
                userId,
                userEmail,
                anomalyType,
                category,
                severity,
                currentAmount,
                baselineAmount,
                title,
                message,
                actionableAdvice,
                detectedAt != null ? detectedAt : Instant.now()
        );
    }

    @Override
    public String aggregateType() {
        return "AiCoach";
    }

    @Override
    public String aggregateId() {
        return userId != null ? userId.toString() : metadata.eventId().toString();
    }
}
