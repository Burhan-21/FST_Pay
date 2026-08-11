package com.fstpay.common.outbox;

public interface EventSerializer {
    String serialize(Object event);
    Object deserialize(String payload, String eventType);
}
