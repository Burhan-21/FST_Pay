package com.fstpay.common.outbox;

import com.fstpay.common.config.KafkaHeadersConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
@Slf4j
@RequiredArgsConstructor
public class KafkaEventDispatcher implements EventDispatcher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final TopicResolver topicResolver;
    private final io.opentelemetry.api.OpenTelemetry openTelemetry;
    private final io.opentelemetry.api.trace.Tracer tracer;

    @Override
    public void dispatch(OutboxEvent event) {
        String topic = topicResolver.resolve(event.getEventType());
        String partitionKey = event.getAggregateId();

        io.opentelemetry.api.trace.Span span = tracer.spanBuilder("Kafka Send")
                .setAttribute("event.id", event.getId().toString())
                .setAttribute("event.type", event.getEventType())
                .setAttribute("aggregate.id", event.getAggregateId())
                .setAttribute("aggregate.type", event.getAggregateType())
                .setAttribute("topic", topic)
                .setAttribute("dispatcher.type", DispatcherType.KAFKA.name())
                .startSpan();

        log.debug("Dispatching event {} to Kafka topic {} with partitionKey {}.", 
                event.getId(), topic, partitionKey);

        ProducerRecord<String, String> record = new ProducerRecord<>(topic, partitionKey, event.getPayload());

        // Populate Kafka headers using KafkaHeadersConstants
        addHeader(record, KafkaHeadersConstants.EVENT_ID, event.getId().toString());
        addHeader(record, KafkaHeadersConstants.EVENT_TYPE, event.getEventType());
        addHeader(record, KafkaHeadersConstants.AGGREGATE_TYPE, event.getAggregateType());
        addHeader(record, KafkaHeadersConstants.AGGREGATE_ID, event.getAggregateId());
        addHeader(record, KafkaHeadersConstants.SCHEMA_VERSION, String.valueOf(event.getEventVersion()));

        if (event.getCorrelationId() != null) {
            addHeader(record, KafkaHeadersConstants.CORRELATION_ID, event.getCorrelationId());
        }
        if (event.getCausationId() != null) {
            addHeader(record, KafkaHeadersConstants.CAUSATION_ID, event.getCausationId());
        }

        // Inject OpenTelemetry context into Kafka headers
        try (io.opentelemetry.context.Scope scope = span.makeCurrent()) {
            openTelemetry.getPropagators().getTextMapPropagator().inject(io.opentelemetry.context.Context.current(), record, (carrier, key, value) -> {
                if (key != null && value != null) {
                    // Remove existing header with same key if present to avoid duplication
                    carrier.headers().remove(key);
                    carrier.headers().add(key, value.getBytes(StandardCharsets.UTF_8));
                }
            });

            kafkaTemplate.send(record).get(); // Synchronous send to ensure delivery before matching outbox transaction commits
        } catch (Exception e) {
            span.recordException(e);
            log.error("Failed to send Kafka record for event {}: {}", event.getId(), e.getMessage());
            throw new RuntimeException("Kafka dispatch failure", e);
        } finally {
            span.end();
        }
    }

    private void addHeader(ProducerRecord<String, String> record, String key, String value) {
        if (value != null) {
            record.headers().add(key, value.getBytes(StandardCharsets.UTF_8));
        }
    }
}
