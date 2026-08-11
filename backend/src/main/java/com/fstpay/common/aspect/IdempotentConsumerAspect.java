package com.fstpay.common.aspect;

import com.fstpay.common.config.KafkaHeadersConstants;
import com.fstpay.common.event.DomainEvent;
import com.fstpay.common.outbox.ProcessedEvent;
import com.fstpay.common.outbox.ProcessedEventRepository;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class IdempotentConsumerAspect {

    private final ProcessedEventRepository processedEventRepository;
    private final io.opentelemetry.api.OpenTelemetry openTelemetry;
    private final io.opentelemetry.api.trace.Tracer tracer;
    private final MeterRegistry meterRegistry;

    private static final io.opentelemetry.context.propagation.TextMapGetter<ConsumerRecord<?, ?>> GETTER =
        new io.opentelemetry.context.propagation.TextMapGetter<>() {
            @Override
            public Iterable<String> keys(ConsumerRecord<?, ?> carrier) {
                java.util.List<String> keys = new java.util.ArrayList<>();
                carrier.headers().forEach(header -> keys.add(header.key()));
                return keys;
            }

            @Override
            public String get(ConsumerRecord<?, ?> carrier, String key) {
                org.apache.kafka.common.header.Header header = carrier.headers().lastHeader(key);
                if (header != null && header.value() != null) {
                    return new String(header.value(), StandardCharsets.UTF_8);
                }
                return null;
            }
        };

    @Around("@annotation(com.fstpay.common.aspect.IdempotentConsumer)")
    public Object enforceIdempotency(ProceedingJoinPoint joinPoint) throws Throwable {
        UUID eventId = null;
        ConsumerRecord<?, ?> kafkaRecord = null;

        // Try to extract eventId and ConsumerRecord from arguments
        for (Object arg : joinPoint.getArgs()) {
            if (arg instanceof DomainEvent) {
                DomainEvent domainEvent = (DomainEvent) arg;
                if (domainEvent.metadata() != null) {
                    eventId = domainEvent.metadata().eventId();
                }
            } else if (arg instanceof ConsumerRecord) {
                kafkaRecord = (ConsumerRecord<?, ?>) arg;
                org.apache.kafka.common.header.Header header = kafkaRecord.headers().lastHeader(KafkaHeadersConstants.EVENT_ID);
                if (header != null && header.value() != null) {
                    try {
                        eventId = UUID.fromString(new String(header.value(), StandardCharsets.UTF_8));
                    } catch (IllegalArgumentException e) {
                        log.warn("Failed to parse eventId header from ConsumerRecord: {}", e.getMessage());
                    }
                }
            }
        }

        // Extract trace context
        io.opentelemetry.context.Context parentContext = io.opentelemetry.context.Context.root();
        if (kafkaRecord != null) {
            parentContext = openTelemetry.getPropagators().getTextMapPropagator()
                    .extract(io.opentelemetry.context.Context.root(), kafkaRecord, GETTER);
        }

        // 1. Start Consumer Execute Span
        String listenerClass = joinPoint.getTarget().getClass().getName();
        String eventType = kafkaRecord != null ? getHeaderString(kafkaRecord, KafkaHeadersConstants.EVENT_TYPE) : "Unknown";
        String aggregateId = kafkaRecord != null ? getHeaderString(kafkaRecord, KafkaHeadersConstants.AGGREGATE_ID) : "Unknown";
        String aggregateType = kafkaRecord != null ? getHeaderString(kafkaRecord, KafkaHeadersConstants.AGGREGATE_TYPE) : "Unknown";

        io.opentelemetry.api.trace.SpanBuilder consumerSpanBuilder = tracer.spanBuilder("Consumer Execute")
                .setParent(parentContext)
                .setAttribute("listener.class", listenerClass);

        if (eventId != null) {
            consumerSpanBuilder.setAttribute("event.id", eventId.toString());
        }
        if (kafkaRecord != null) {
            consumerSpanBuilder.setAttribute("topic", kafkaRecord.topic())
                    .setAttribute("partition", kafkaRecord.partition())
                    .setAttribute("offset", kafkaRecord.offset())
                    .setAttribute("event.type", eventType)
                    .setAttribute("aggregate.id", aggregateId)
                    .setAttribute("aggregate.type", aggregateType);
        }

        io.opentelemetry.api.trace.Span consumerSpan = consumerSpanBuilder.startSpan();

        // Populate MDC context
        try (io.opentelemetry.context.Scope scope = consumerSpan.makeCurrent()) {
            MDC.put("traceId", consumerSpan.getSpanContext().getTraceId());
            MDC.put("spanId", consumerSpan.getSpanContext().getSpanId());
            MDC.put("eventId", eventId != null ? eventId.toString() : "");
            MDC.put("listenerClass", listenerClass);
            MDC.put("dispatcherType", "KAFKA");

            if (kafkaRecord != null) {
                MDC.put("topic", kafkaRecord.topic());
                MDC.put("partition", String.valueOf(kafkaRecord.partition()));
                MDC.put("offset", String.valueOf(kafkaRecord.offset()));
                MDC.put("correlationId", getHeaderString(kafkaRecord, KafkaHeadersConstants.CORRELATION_ID));
                MDC.put("aggregateId", aggregateId);
                MDC.put("aggregateType", aggregateType);
            }

            if (eventId == null) {
                log.warn("Could not resolve eventId for idempotent consumer guard. Proceeding without de-duplication for method: {}.",
                        joinPoint.getSignature().toShortString());
                return joinPoint.proceed();
            }

            // check if already processed
            if (processedEventRepository.existsById(eventId)) {
                log.info("Duplicate event detected: {}. Skipping execution for consumer: {}.", 
                        eventId, joinPoint.getSignature().toShortString());
                meterRegistry.counter("fstpay.consumer.duplicate.total").increment();
                return null; // Skip execution
            }

            // 2. Start Listener Execute Span
            io.opentelemetry.api.trace.Span listenerSpan = tracer.spanBuilder("Listener Execute")
                    .setParent(io.opentelemetry.context.Context.current())
                    .setAttribute("listener.class", listenerClass)
                    .setAttribute("event.id", eventId.toString())
                    .setAttribute("event.type", eventType)
                    .setAttribute("aggregate.id", aggregateId)
                    .setAttribute("aggregate.type", aggregateType)
                    .startSpan();

            Object result;
            try (io.opentelemetry.context.Scope listenerScope = listenerSpan.makeCurrent()) {
                result = joinPoint.proceed();
                meterRegistry.counter("fstpay.consumer.processed.total").increment();
            } catch (Throwable t) {
                listenerSpan.recordException(t);
                meterRegistry.counter("fstpay.consumer.failed.total").increment();
                throw t;
            } finally {
                listenerSpan.end();
            }

            // Record processed event upon successful execution
            ProcessedEvent processedEvent = ProcessedEvent.builder()
                    .eventId(eventId)
                    .processedAt(Instant.now())
                    .build();
            processedEventRepository.saveAndFlush(processedEvent);

            log.debug("Event {} processed successfully and logged to processed_events.", eventId);
            return result;
        } catch (Throwable t) {
            consumerSpan.recordException(t);
            throw t;
        } finally {
            consumerSpan.end();
            // Clean up MDC keys to avoid leakage
            MDC.remove("traceId");
            MDC.remove("spanId");
            MDC.remove("correlationId");
            MDC.remove("eventId");
            MDC.remove("aggregateId");
            MDC.remove("aggregateType");
            MDC.remove("dispatcherType");
            MDC.remove("topic");
            MDC.remove("partition");
            MDC.remove("offset");
            MDC.remove("listenerClass");
            MDC.remove("consumerGroup");
        }
    }

    private String getHeaderString(ConsumerRecord<?, ?> record, String key) {
        org.apache.kafka.common.header.Header header = record.headers().lastHeader(key);
        if (header != null && header.value() != null) {
            return new String(header.value(), StandardCharsets.UTF_8);
        }
        return "";
    }
}
