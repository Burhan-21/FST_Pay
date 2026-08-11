package com.fstpay.common.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fstpay.common.event.DomainEvent;
import com.fstpay.common.event.EventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxEventPublisher implements EventPublisher {

    private final OutboxEventRepository outboxEventRepository;
    private final EventSerializer eventSerializer;
    private final io.opentelemetry.api.trace.Tracer tracer;

    @Override
    public void publish(DomainEvent event) {
        io.opentelemetry.api.trace.Span span = tracer.spanBuilder("Outbox Persistence")
                .setAttribute("event.id", event.metadata().eventId().toString())
                .setAttribute("event.type", event.getClass().getName())
                .setAttribute("aggregate.id", event.aggregateId())
                .setAttribute("aggregate.type", event.aggregateType())
                .startSpan();

        try (io.opentelemetry.context.Scope scope = span.makeCurrent()) {
            String payload = eventSerializer.serialize(event);
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .id(event.metadata().eventId())
                    .eventType(event.getClass().getName())
                    .eventVersion(event.metadata().version())
                    .aggregateType(event.aggregateType())
                    .aggregateId(event.aggregateId())
                    .correlationId(event.metadata().correlationId())
                    .causationId(event.metadata().causationId())
                    .payload(payload)
                    .status(OutboxStatus.PENDING)
                    .retryCount(0)
                    .createdAt(Instant.now())
                    .build();

            outboxEventRepository.save(outboxEvent);
            log.debug("Event {} persisted to outbox. Correlation ID: {}", 
                    event.getClass().getSimpleName(), event.metadata().correlationId());
        } catch (Exception e) {
            span.recordException(e);
            log.error("Failed to serialize event: {}", event, e);
            throw new RuntimeException("Failed to serialize event for outbox", e);
        } finally {
            span.end();
        }
    }
}
