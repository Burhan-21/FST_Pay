package com.fstpay.integration;

import com.fstpay.common.aspect.IdempotentConsumer;
import com.fstpay.common.config.KafkaHeadersConstants;
import com.fstpay.common.event.DomainEvent;
import com.fstpay.common.event.EventMetadata;
import com.fstpay.common.outbox.*;
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
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.MessageListenerContainer;
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
        brokerProperties = {"listeners=PLAINTEXT://localhost:9093", "port=9093"},
        topics = {"fstpay.integration.events", "fstpay.integration.events.DLT"}
)
@ActiveProfiles("test")
@Import(KafkaIntegrationTest.TestConsumerConfig.class)
public class KafkaIntegrationTest extends AbstractIntegrationTest {

    @DynamicPropertySource
    static void kafkaProperties(DynamicPropertyRegistry registry) {
        registry.add("app.kafka.bootstrap-servers", () -> "localhost:9093");
        registry.add("spring.kafka.bootstrap-servers", () -> "localhost:9093");
        registry.add("app.outbox.dispatcher-type", () -> "kafka");
        registry.add("spring.kafka.listener.auto-startup", () -> "true");
    }

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    @Autowired
    private OutboxProcessor outboxProcessor;

    @Autowired
    private ProcessedEventRepository processedEventRepository;

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    @Autowired
    private TestKafkaConsumer testKafkaConsumer;

    @Autowired
    private KafkaListenerEndpointRegistry listenerRegistry;

    @Autowired
    private EventSerializer eventSerializer;

    @BeforeEach
    void setup() {
        outboxEventRepository.deleteAll();
        processedEventRepository.deleteAll();
        testKafkaConsumer.clear();
        
        // Ensure listener containers are started and ready for each test
        listenerRegistry.getListenerContainers().forEach(container -> {
            if (!container.isRunning()) {
                container.start();
            }
        });
    }

    @Test
    void testKafkaEventPublishingAndIdempotentConsumption() {
        UUID eventId = UUID.randomUUID();
        EventMetadata metadata = new EventMetadata(eventId, java.time.Instant.now(), TestKafkaEvent.class.getName(), "corr-123", "caus-456", 1);
        TestKafkaEvent event = new TestKafkaEvent(metadata, "agg-123", "Hello Kafka!");

        String payload = eventSerializer.serialize(event);
        OutboxEvent outboxEvent = OutboxEvent.builder()
                .id(eventId)
                .eventType(event.getClass().getName())
                .eventVersion(1)
                .aggregateType(event.aggregateType())
                .aggregateId(event.aggregateId())
                .correlationId(metadata.correlationId())
                .causationId(metadata.causationId())
                .payload(payload)
                .status(OutboxStatus.PENDING)
                .createdAt(java.time.Instant.now())
                .build();

        outboxEventRepository.saveAndFlush(outboxEvent);

        // Process event, which triggers KafkaEventDispatcher
        outboxProcessor.process(eventId);

        // Wait and verify consumer receives the message
        await().atMost(15, TimeUnit.SECONDS).untilAsserted(() -> {
            assertThat(testKafkaConsumer.getReceivedEvents()).hasSize(1);
            assertThat(testKafkaConsumer.getReceivedEvents().get(0).data()).isEqualTo("Hello Kafka!");
        });

        // Verify de-duplication: process again with same eventId
        testKafkaConsumer.getReceivedEvents().clear();
        
        // Simulating duplicate message arrival via manual template send
        org.apache.kafka.clients.producer.ProducerRecord<String, String> duplicateRecord = 
                new org.apache.kafka.clients.producer.ProducerRecord<>("fstpay.integration.events", "agg-123", payload);
        duplicateRecord.headers().add(KafkaHeadersConstants.EVENT_ID, eventId.toString().getBytes(StandardCharsets.UTF_8));
        kafkaTemplate.send(duplicateRecord);

        // Wait a few seconds and verify it was skipped (no execution added)
        try { Thread.sleep(2000); } catch (InterruptedException e) {}
        assertThat(testKafkaConsumer.getReceivedEvents()).isEmpty();
    }

    @Test
    void testOrderPreservationByAggregateId() {
        List<UUID> eventIds = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        for (int i = 0; i < eventIds.size(); i++) {
            UUID id = eventIds.get(i);
            EventMetadata metadata = new EventMetadata(id, java.time.Instant.now(), TestKafkaEvent.class.getName(), "corr-" + i, null, 1);
            TestKafkaEvent event = new TestKafkaEvent(metadata, "same-agg", "Data " + i);
            String payload = eventSerializer.serialize(event);
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .id(id)
                    .eventType(event.getClass().getName())
                    .eventVersion(1)
                    .aggregateType(event.aggregateType())
                    .aggregateId(event.aggregateId())
                    .correlationId(metadata.correlationId())
                    .payload(payload)
                    .status(OutboxStatus.PENDING)
                    .createdAt(java.time.Instant.now())
                    .build();
            outboxEventRepository.saveAndFlush(outboxEvent);
            outboxProcessor.process(id);
        }

        await().atMost(15, TimeUnit.SECONDS).untilAsserted(() -> {
            assertThat(testKafkaConsumer.getReceivedEvents()).hasSize(3);
        });

        // Assert order matches publishing order
        assertThat(testKafkaConsumer.getReceivedEvents().get(0).data()).isEqualTo("Data 0");
        assertThat(testKafkaConsumer.getReceivedEvents().get(1).data()).isEqualTo("Data 1");
        assertThat(testKafkaConsumer.getReceivedEvents().get(2).data()).isEqualTo("Data 2");
    }

    @Test
    void testConsumerRecoveryAfterDowntime() {
        // Stop listener container
        listenerRegistry.getListenerContainers().forEach(MessageListenerContainer::stop);

        UUID eventId = UUID.randomUUID();
        EventMetadata metadata = new EventMetadata(eventId, java.time.Instant.now(), TestKafkaEvent.class.getName(), "corr-recovery", null, 1);
        TestKafkaEvent event = new TestKafkaEvent(metadata, "agg-recovery", "Recovery Message");
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
        outboxEventRepository.saveAndFlush(outboxEvent);
        outboxProcessor.process(eventId);

        // Verify consumer did not process it since it's stopped
        try { Thread.sleep(2000); } catch (InterruptedException e) {}
        assertThat(testKafkaConsumer.getReceivedEvents()).isEmpty();

        // Restart listener container
        listenerRegistry.getListenerContainers().forEach(MessageListenerContainer::start);

        // Verify consumer recovers and processes the message
        await().atMost(15, TimeUnit.SECONDS).untilAsserted(() -> {
            assertThat(testKafkaConsumer.getReceivedEvents()).hasSize(1);
            assertThat(testKafkaConsumer.getReceivedEvents().get(0).data()).isEqualTo("Recovery Message");
        });
    }

    @Test
    void testDltRoutingOnFailure() {
        testKafkaConsumer.setFailExecution(true);

        UUID eventId = UUID.randomUUID();
        EventMetadata metadata = new EventMetadata(eventId, java.time.Instant.now(), TestKafkaEvent.class.getName(), "corr-fail", null, 1);
        TestKafkaEvent event = new TestKafkaEvent(metadata, "agg-fail", "Failing Message");
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
        outboxEventRepository.saveAndFlush(outboxEvent);
        outboxProcessor.process(eventId);

        // DLT listener should receive the message after retries are exhausted
        await().atMost(20, TimeUnit.SECONDS).untilAsserted(() -> {
            assertThat(testKafkaConsumer.getDltRecords()).hasSize(1);
        });
    }

    public static record TestKafkaEvent(
            EventMetadata metadata,
            String aggregateId,
            String data
    ) implements DomainEvent {
        @Override
        public String aggregateType() { return "integration"; }
        @Override
        public String aggregateId() { return aggregateId; }
    }

    @TestConfiguration
    public static class TestConsumerConfig {

        @Bean
        public TestKafkaConsumer testKafkaConsumer(EventSerializer eventSerializer) {
            return new TestKafkaConsumer(eventSerializer);
        }
    }

    public static class TestKafkaConsumer {
        private final EventSerializer eventSerializer;
        private final List<TestKafkaEvent> receivedEvents = new CopyOnWriteArrayList<>();
        private final List<ConsumerRecord<String, String>> dltRecords = new CopyOnWriteArrayList<>();
        private boolean failExecution = false;

        public TestKafkaConsumer(EventSerializer eventSerializer) {
            this.eventSerializer = eventSerializer;
        }

        @KafkaListener(topics = "fstpay.integration.events", groupId = "test-group")
        @IdempotentConsumer
        public void consume(ConsumerRecord<String, String> record) {
            TestKafkaEvent event = (TestKafkaEvent) eventSerializer.deserialize(record.value(), TestKafkaEvent.class.getName());
            receivedEvents.add(event);

            if (failExecution) {
                throw new RuntimeException("Simulated processing failure");
            }
        }

        @KafkaListener(topics = "fstpay.integration.events.DLT", groupId = "test-dlt-group")
        public void consumeDlt(ConsumerRecord<String, String> record) {
            dltRecords.add(record);
        }

        public List<TestKafkaEvent> getReceivedEvents() { return receivedEvents; }
        public List<ConsumerRecord<String, String>> getDltRecords() { return dltRecords; }
        public void setFailExecution(boolean fail) { this.failExecution = fail; }
        public void clear() {
            receivedEvents.clear();
            dltRecords.clear();
            failExecution = false;
        }
    }
}
