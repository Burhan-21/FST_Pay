package com.fstpay.common.event;

public interface DomainEvent {
    EventMetadata metadata();

    default String aggregateType() {
        return "Event";
    }

    default String aggregateId() {
        return metadata().eventId().toString();
    }
}
