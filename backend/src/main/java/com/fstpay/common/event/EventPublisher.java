package com.fstpay.common.event;

public interface EventPublisher {
    void publish(DomainEvent event);
}
