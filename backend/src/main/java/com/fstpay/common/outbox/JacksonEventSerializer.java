package com.fstpay.common.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JacksonEventSerializer implements EventSerializer {

    private final ObjectMapper objectMapper;

    @Override
    public String serialize(Object event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize event", e);
        }
    }

    @Override
    public Object deserialize(String payload, String eventType) {
        try {
            Class<?> clazz = Class.forName(eventType);
            return objectMapper.readValue(payload, clazz);
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize event of type: " + eventType, e);
        }
    }
}
