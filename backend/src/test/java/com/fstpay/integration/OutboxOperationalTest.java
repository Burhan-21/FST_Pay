package com.fstpay.integration;

import com.fstpay.common.event.DomainEvent;
import com.fstpay.common.event.EventMetadata;
import com.fstpay.common.event.EventPublisher;
import com.fstpay.common.filter.CorrelationIdFilter;
import com.fstpay.common.outbox.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.context.event.EventListener;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@Import(OutboxOperationalTest.ConfigurableTestListenerConfig.class)
class OutboxOperationalTest extends AbstractIntegrationTest {

    @Autowired
    private EventSerializer eventSerializer;

    @Autowired
    private OutboxAdminService outboxAdminService;

    @Autowired
    private OutboxHealthIndicator outboxHealthIndicator;

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    @Autowired
    private EventPublisher eventPublisher;

    @Autowired
    private OutboxPublisher outboxPublisher;

    @Autowired
    private CorrelationIdFilter correlationIdFilter;

    private static boolean shouldListenerFail = true;

    @BeforeEach
    void setUp() {
        outboxEventRepository.deleteAllInBatch();
        shouldListenerFail = true;
        MDC.clear();
    }

    @Test
    void testSerializerRoundTrip() {
        TestConfigurableEvent event = new TestConfigurableEvent(EventMetadata.create("TestConfigurableEvent"));
        String serialized = eventSerializer.serialize(event);
        assertNotNull(serialized);

        Object deserialized = eventSerializer.deserialize(serialized, TestConfigurableEvent.class.getName());
        assertTrue(deserialized instanceof TestConfigurableEvent);
        assertEquals(event.metadata().eventId(), ((TestConfigurableEvent) deserialized).metadata().eventId());
    }

    @Test
    void testCorrelationIdPropagationAndMdcCleanup() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        String testCorrId = UUID.randomUUID().toString();
        request.addHeader(CorrelationIdFilter.CORRELATION_HEADER, testCorrId);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res) {
                // Inside the request execution block: MDC must be populated
                assertEquals(testCorrId, MDC.get("correlationId"));

                // When publishing an event here, the outbox record must carry the correlation ID
                TestConfigurableEvent event = new TestConfigurableEvent(EventMetadata.create("TestConfigurableEvent"));
                eventPublisher.publish(event);
            }
        };

        // Execute filter
        correlationIdFilter.doFilter(request, response, filterChain);

        // Verify response header has the ID
        assertEquals(testCorrId, response.getHeader(CorrelationIdFilter.CORRELATION_HEADER));

        // Verify MDC is cleared after request completion
        assertNull(MDC.get("correlationId"));

        // Verify outbox row in DB has the propagated correlation ID
        List<OutboxEvent> outboxList = outboxEventRepository.findAll();
        assertEquals(1, outboxList.size());
        assertEquals(testCorrId, outboxList.get(0).getCorrelationId());
    }

    @Test
    void testRetryTransitionsDeadLetterToPendingToSent() {
        // 1. Publish configurable event designed to fail initially
        TestConfigurableEvent event = new TestConfigurableEvent(EventMetadata.create("TestConfigurableEvent"));
        eventPublisher.publish(event);

        UUID eventId = event.metadata().eventId();

        // 2. Trigger failures until DEAD_LETTER
        shouldListenerFail = true;
        for (int i = 0; i < 5; i++) {
            outboxPublisher.publishPendingEvents();
        }

        OutboxEvent deadLetterEvent = outboxEventRepository.findById(eventId).orElseThrow();
        assertEquals(OutboxStatus.DEAD_LETTER, deadLetterEvent.getStatus());
        assertEquals(5, deadLetterEvent.getRetryCount());

        // 3. Trigger admin retry
        boolean retryQueued = outboxAdminService.retry(eventId);
        assertTrue(retryQueued);

        OutboxEvent resetEvent = outboxEventRepository.findById(eventId).orElseThrow();
        assertEquals(OutboxStatus.PENDING, resetEvent.getStatus());
        assertEquals(0, resetEvent.getRetryCount());
        assertNull(resetEvent.getLastError());

        // 4. Change listener to succeed and process again
        shouldListenerFail = false;
        outboxPublisher.publishPendingEvents();

        OutboxEvent sentEvent = outboxEventRepository.findById(eventId).orElseThrow();
        assertEquals(OutboxStatus.SENT, sentEvent.getStatus());
    }

    @Test
    void testCleanupOldEvents() {
        Instant now = Instant.now();

        // 1. Older SENT event (cutoff is 7 days, event is 8 days old) -> should be deleted
        OutboxEvent oldSent = OutboxEvent.builder()
                .id(UUID.randomUUID())
                .eventType("TestEvent")
                .eventVersion(1)
                .aggregateType("Test")
                .aggregateId("1")
                .correlationId("corr")
                .payload("{}")
                .status(OutboxStatus.SENT)
                .retryCount(0)
                .createdAt(now.minus(8, ChronoUnit.DAYS))
                .publishedAt(now.minus(8, ChronoUnit.DAYS))
                .build();

        // 2. Newer SENT event (2 days old) -> should be kept
        OutboxEvent newSent = OutboxEvent.builder()
                .id(UUID.randomUUID())
                .eventType("TestEvent")
                .eventVersion(1)
                .aggregateType("Test")
                .aggregateId("2")
                .correlationId("corr")
                .payload("{}")
                .status(OutboxStatus.SENT)
                .retryCount(0)
                .createdAt(now.minus(2, ChronoUnit.DAYS))
                .publishedAt(now.minus(2, ChronoUnit.DAYS))
                .build();

        // 3. Older PENDING event (8 days old) -> should be kept
        OutboxEvent oldPending = OutboxEvent.builder()
                .id(UUID.randomUUID())
                .eventType("TestEvent")
                .eventVersion(1)
                .aggregateType("Test")
                .aggregateId("3")
                .correlationId("corr")
                .payload("{}")
                .status(OutboxStatus.PENDING)
                .retryCount(0)
                .createdAt(now.minus(8, ChronoUnit.DAYS))
                .build();

        outboxEventRepository.saveAll(List.of(oldSent, newSent, oldPending));

        // 4. Run cleanup
        int deleted = outboxAdminService.cleanup(7, 100);
        assertEquals(1, deleted);

        // 5. Verify records
        assertTrue(outboxEventRepository.findById(oldSent.getId()).isEmpty());
        assertTrue(outboxEventRepository.findById(newSent.getId()).isPresent());
        assertTrue(outboxEventRepository.findById(oldPending.getId()).isPresent());
    }

    @Test
    void testHealthIndicatorDetailsAndStall() {
        Instant now = Instant.now();

        // 1. Normal State - Empty outbox
        Health healthNormal = outboxHealthIndicator.health();
        assertEquals(Status.UP, healthNormal.getStatus());
        assertEquals(0L, healthNormal.getDetails().get("pending"));
        assertEquals(0L, healthNormal.getDetails().get("deadLetter"));

        // 2. State with pending event but within threshold (1 minute old)
        OutboxEvent pendingEvent = OutboxEvent.builder()
                .id(UUID.randomUUID())
                .eventType("TestEvent")
                .eventVersion(1)
                .aggregateType("Test")
                .aggregateId("1")
                .correlationId("corr")
                .payload("{}")
                .status(OutboxStatus.PENDING)
                .retryCount(0)
                .createdAt(now.minus(1, ChronoUnit.MINUTES))
                .build();
        outboxEventRepository.save(pendingEvent);

        Health healthPendingOk = outboxHealthIndicator.health();
        assertEquals(Status.UP, healthPendingOk.getStatus());
        assertEquals(1L, healthPendingOk.getDetails().get("pending"));
        assertTrue((Long) healthPendingOk.getDetails().get("oldestPendingAgeSeconds") >= 60);

        // 3. Stalled State - Oldest pending event exceeds stall threshold (e.g. 10 minutes old)
        pendingEvent.setCreatedAt(now.minus(10, ChronoUnit.MINUTES));
        outboxEventRepository.save(pendingEvent);

        Health healthStalled = outboxHealthIndicator.health();
        assertEquals(Status.DOWN, healthStalled.getStatus());
        assertTrue(healthStalled.getDetails().get("message").toString().contains("Outbox processing is stalled"));
    }

    public record TestConfigurableEvent(EventMetadata metadata) implements DomainEvent {}

    @TestConfiguration
    static class ConfigurableTestListenerConfig {
        @EventListener
        public void handleTestConfigurableEvent(TestConfigurableEvent event) {
            if (shouldListenerFail) {
                throw new RuntimeException("Simulated configurable failure");
            }
        }
    }
}
