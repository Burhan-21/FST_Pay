package com.fstpay.integration;

import com.fstpay.common.aspect.IdempotentConsumer;
import com.fstpay.common.event.DomainEvent;
import com.fstpay.common.event.EventMetadata;
import com.fstpay.common.outbox.EventSerializer;
import com.fstpay.common.outbox.KafkaEventDispatcher;
import com.fstpay.common.outbox.OutboxEvent;
import com.fstpay.common.outbox.OutboxStatus;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.config.KafkaListenerEndpointRegistry;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

@EmbeddedKafka(
        partitions = 1,
        brokerProperties = {"listeners=PLAINTEXT://localhost:9095", "port=9095"},
        topics = {"fstpay.telemetry.events"}
)
@ActiveProfiles("test")
@Import(TelemetryPropagationTest.TelemetryConsumerConfig.class)
public class TelemetryPropagationTest extends AbstractIntegrationTest {

    @DynamicPropertySource
    static void kafkaProperties(DynamicPropertyRegistry registry) {
        registry.add("app.kafka.bootstrap-servers", () -> "localhost:9095");
        registry.add("spring.kafka.bootstrap-servers", () -> "localhost:9095");
        registry.add("app.outbox.dispatcher-type", () -> "kafka");
        registry.add("spring.kafka.listener.auto-startup", () -> "true");
    }

    @Autowired
    private KafkaEventDispatcher kafkaEventDispatcher;

    @Autowired
    private OpenTelemetry openTelemetry;

    @Autowired
    private Tracer tracer;

    @Autowired
    private TelemetryConsumer telemetryConsumer;

    @Autowired
    private KafkaListenerEndpointRegistry listenerRegistry;

    @Autowired
    private EventSerializer eventSerializer;

    @BeforeEach
    void setup() {
        telemetryConsumer.clear();
        listenerRegistry.getListenerContainers().forEach(container -> {
            if (!container.isRunning()) {
                container.start();
            }
        });
    }

    public static record TestTelemetryEvent(
            EventMetadata metadata,
            String aggregateId,
            String payload
    ) implements DomainEvent {
        @Override
        public String aggregateType() { return "telemetry"; }
        @Override
        public String aggregateId() { return aggregateId; }
    }

    @Test
    void testTraceContextPropagationOverKafka() {
        Span parentSpan = tracer.spanBuilder("test-parent-span").startSpan();
        String expectedTraceId = parentSpan.getSpanContext().getTraceId();

        try (Scope scope = parentSpan.makeCurrent()) {
            UUID eventId = UUID.randomUUID();
            EventMetadata metadata = new EventMetadata(eventId, java.time.Instant.now(), TestTelemetryEvent.class.getName(), "corr-111", null, 1);
            TestTelemetryEvent event = new TestTelemetryEvent(metadata, "agg-111", "OTel validation");

            String payload = eventSerializer.serialize(event);
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .id(eventId)
                    .eventType(event.getClass().getName())
                    .eventVersion(1)
                    .aggregateType(event.aggregateType())
                    .aggregateId(event.aggregateId())
                    .correlationId(metadata.correlationId())
                    .payload(payload)
                    .status(OutboxStatus.PENDING)
                    .createdAt(java.time.Instant.now())
                    .build();

            // Dispatch using Kafka dispatcher under active span
            kafkaEventDispatcher.dispatch(outboxEvent);

        } finally {
            parentSpan.end();
        }

        // Wait for the consumer to receive the record
        await().atMost(10, TimeUnit.SECONDS).untilAsserted(() -> {
            assertThat(telemetryConsumer.getReceivedRecords()).hasSize(1);
        });

        // Verify the received traceparent matches the parent span's trace ID
        ConsumerRecord<String, String> record = telemetryConsumer.getReceivedRecords().get(0);
        org.apache.kafka.common.header.Header traceHeader = record.headers().lastHeader("traceparent");
        
        assertThat(traceHeader).isNotNull();
        String traceparent = new String(traceHeader.value(), StandardCharsets.UTF_8);
        assertThat(traceparent).contains(expectedTraceId);
    }

    @TestConfiguration
    public static class TelemetryConsumerConfig {
        @Bean
        public TelemetryConsumer telemetryConsumer() {
            return new TelemetryConsumer();
        }
    }

    public static class TelemetryConsumer {
        private final List<ConsumerRecord<String, String>> receivedRecords = new CopyOnWriteArrayList<>();

        @KafkaListener(topics = "fstpay.telemetry.events", groupId = "telemetry-group")
        @IdempotentConsumer
        public void consume(ConsumerRecord<String, String> record) {
            receivedRecords.add(record);
        }

        public List<ConsumerRecord<String, String>> getReceivedRecords() {
            return receivedRecords;
        }

        public void clear() {
            receivedRecords.clear();
        }
    }
}
