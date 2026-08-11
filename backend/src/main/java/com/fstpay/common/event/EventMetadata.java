package com.fstpay.common.event;

import java.time.Instant;
import java.util.UUID;

public record EventMetadata(
    UUID eventId,
    Instant occurredAt,
    String eventType,
    String correlationId,
    String causationId,
    int version
) {
    public static EventMetadata create(String eventType) {
        String mdcCorrelationId = org.slf4j.MDC.get("correlationId");
        String correlationId = (mdcCorrelationId != null && !mdcCorrelationId.isEmpty()) 
            ? mdcCorrelationId 
            : UUID.randomUUID().toString();

        return new EventMetadata(
            UUID.randomUUID(),
            Instant.now(),
            eventType,
            correlationId,
            null,
            1
        );
    }

    public static EventMetadata create(String eventType, String causationId) {
        String mdcCorrelationId = org.slf4j.MDC.get("correlationId");
        String correlationId = (mdcCorrelationId != null && !mdcCorrelationId.isEmpty()) 
            ? mdcCorrelationId 
            : UUID.randomUUID().toString();

        return new EventMetadata(
            UUID.randomUUID(),
            Instant.now(),
            eventType,
            correlationId,
            causationId,
            1
        );
    }
}
