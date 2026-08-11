package com.fstpay.common.outbox;

public interface EventDispatcher {
    void dispatch(OutboxEvent event);
}
