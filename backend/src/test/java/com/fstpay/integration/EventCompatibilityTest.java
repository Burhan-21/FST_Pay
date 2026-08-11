package com.fstpay.integration;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fstpay.common.outbox.JacksonEventSerializer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

public class EventCompatibilityTest {

    private ObjectMapper objectMapper;
    private JacksonEventSerializer serializer;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        serializer = new JacksonEventSerializer(objectMapper);
    }

    // V1 Event representation
    public static record TestEventV1(
            UUID id,
            String aggregateId,
            String userEmail
    ) {}

    // V2 Event representation (Backward compatible addition of new optional field)
    public static record TestEventV2(
            UUID id,
            String aggregateId,
            String userEmail,
            String fullName
    ) {}

    @Test
    void testBackwardCompatibility_OldConsumerNewProducer() throws Exception {
        // New producer publishes V2 event
        TestEventV2 v2Event = new TestEventV2(UUID.randomUUID(), "agg-123", "test@fstpay.com", "John Doe");
        String json = objectMapper.writeValueAsString(v2Event);

        // Old consumer deserializes into V1 event (which doesn't have fullName)
        TestEventV1 v1Event = objectMapper.readValue(json, TestEventV1.class);

        assertNotNull(v1Event);
        assertEquals(v2Event.id(), v1Event.id());
        assertEquals(v2Event.aggregateId(), v1Event.aggregateId());
        assertEquals(v2Event.userEmail(), v1Event.userEmail());
    }

    @Test
    void testForwardCompatibility_NewConsumerOldProducer() throws Exception {
        // Old producer publishes V1 event
        TestEventV1 v1Event = new TestEventV1(UUID.randomUUID(), "agg-123", "test@fstpay.com");
        String json = objectMapper.writeValueAsString(v1Event);

        // New consumer deserializes into V2 event (should default new field to null)
        TestEventV2 v2Event = objectMapper.readValue(json, TestEventV2.class);

        assertNotNull(v2Event);
        assertEquals(v1Event.id(), v2Event.id());
        assertEquals(v1Event.aggregateId(), v2Event.aggregateId());
        assertEquals(v1Event.userEmail(), v2Event.userEmail());
        assertNull(v2Event.fullName());
    }

    @Test
    void testUnknownFieldTolerance() throws Exception {
        // Payload with completely unknown attributes
        String jsonWithUnknowns = "{\"id\":\"" + UUID.randomUUID() + "\",\"aggregateId\":\"agg-123\",\"userEmail\":\"test@fstpay.com\",\"someRandomAttribute\":\"xyz\",\"nestedObj\":{\"a\":1}}";

        // Deserialization should not fail because FAIL_ON_UNKNOWN_PROPERTIES is false
        assertDoesNotThrow(() -> {
            TestEventV1 event = objectMapper.readValue(jsonWithUnknowns, TestEventV1.class);
            assertNotNull(event);
            assertEquals("agg-123", event.aggregateId());
        });
    }

    @Test
    void testSerializationRoundTrip() throws Exception {
        TestEventV1 originalEvent = new TestEventV1(UUID.randomUUID(), "agg-456", "roundtrip@fstpay.com");
        String json = serializer.serialize(originalEvent);
        
        TestEventV1 deserializedEvent = (TestEventV1) serializer.deserialize(json, TestEventV1.class.getName());
        
        assertNotNull(deserializedEvent);
        assertEquals(originalEvent.id(), deserializedEvent.id());
        assertEquals(originalEvent.aggregateId(), deserializedEvent.aggregateId());
        assertEquals(originalEvent.userEmail(), deserializedEvent.userEmail());
    }
}
