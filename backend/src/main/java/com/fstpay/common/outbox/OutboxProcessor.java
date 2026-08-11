package com.fstpay.common.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fstpay.common.event.DomainEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import io.micrometer.core.instrument.MeterRegistry;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OutboxProcessor {

    private final OutboxEventRepository outboxEventRepository;
    private final EventDispatcher eventDispatcher;
    private final MeterRegistry meterRegistry;
    private final OutboxProperties outboxProperties;
    private final io.opentelemetry.api.trace.Tracer tracer;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void process(UUID id) {
        // Attempt to lock the row with PESSIMISTIC_WRITE and SKIP LOCKED
        OutboxEvent event = outboxEventRepository.findByIdForUpdate(id).orElse(null);
        if (event == null || event.getStatus() == OutboxStatus.SENT || event.getStatus() == OutboxStatus.DEAD_LETTER) {
            return;
        }

        event.setStatus(OutboxStatus.PROCESSING);
        outboxEventRepository.saveAndFlush(event);

        io.opentelemetry.api.trace.Span span = tracer.spanBuilder("Outbox Poll")
                .setAttribute("event.id", event.getId().toString())
                .setAttribute("event.type", event.getEventType())
                .setAttribute("aggregate.id", event.getAggregateId())
                .setAttribute("aggregate.type", event.getAggregateType())
                .setAttribute("retry.count", event.getRetryCount())
                .setAttribute("dispatcher.type", outboxProperties.getDispatcherType().name())
                .startSpan();

        long startTime = System.nanoTime();
        try (io.opentelemetry.context.Scope scope = span.makeCurrent()) {
            // Dispatch the event using the active EventDispatcher implementation
            eventDispatcher.dispatch(event);

            // Transition to SENT status
            event.setStatus(OutboxStatus.SENT);
            event.setPublishedAt(Instant.now());
            event.setLastError(null);

            meterRegistry.counter("fstpay.outbox.events.published.total").increment();
        } catch (Exception e) {
            span.recordException(e);
            log.error("Failed to publish outbox event: {}", id, e);
            int retries = event.getRetryCount() + 1;
            event.setRetryCount(retries);
            event.setLastError(e.getMessage() != null ? e.getMessage() : e.toString());
            meterRegistry.counter("fstpay.outbox.events.retry.total").increment();

            if (retries >= outboxProperties.getMaxRetries()) {
                event.setStatus(OutboxStatus.DEAD_LETTER);
                meterRegistry.counter("fstpay.outbox.events.dead_letter.total").increment();
            } else {
                event.setStatus(OutboxStatus.FAILED);
                meterRegistry.counter("fstpay.outbox.events.failed.total").increment();
            }
        } finally {
            span.end();
            long duration = System.nanoTime() - startTime;
            meterRegistry.timer("fstpay.outbox.processing.duration")
                    .record(duration, java.util.concurrent.TimeUnit.NANOSECONDS);
        }
        outboxEventRepository.save(event);
    }
}
