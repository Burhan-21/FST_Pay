package com.fstpay.common.outbox;

public interface TopicResolver {
    String resolve(String eventType);
}
