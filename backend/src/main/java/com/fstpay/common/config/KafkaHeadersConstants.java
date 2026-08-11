package com.fstpay.common.config;

public final class KafkaHeadersConstants {

    private KafkaHeadersConstants() {}

    public static final String EVENT_ID = "eventId";
    public static final String EVENT_TYPE = "eventType";
    public static final String AGGREGATE_TYPE = "aggregateType";
    public static final String AGGREGATE_ID = "aggregateId";
    public static final String SCHEMA_VERSION = "schemaVersion";
    public static final String CORRELATION_ID = "X-Correlation-ID";
    public static final String CAUSATION_ID = "X-Causation-ID";
}
