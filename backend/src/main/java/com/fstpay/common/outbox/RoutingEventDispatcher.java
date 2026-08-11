package com.fstpay.common.outbox;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Component
@Primary
public class RoutingEventDispatcher implements EventDispatcher {

    private final SpringEventDispatcher springDispatcher;
    private final KafkaEventDispatcher kafkaDispatcher;
    private final OutboxProperties properties;
    private final MeterRegistry meterRegistry;

    public RoutingEventDispatcher(SpringEventDispatcher springDispatcher,
                                  KafkaEventDispatcher kafkaDispatcher,
                                  OutboxProperties properties,
                                  MeterRegistry meterRegistry) {
        this.springDispatcher = springDispatcher;
        this.kafkaDispatcher = kafkaDispatcher;
        this.properties = properties;
        this.meterRegistry = meterRegistry;
    }

    @Override
    public void dispatch(OutboxEvent event) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            if (properties.getDispatcherType() == DispatcherType.KAFKA) {
                kafkaDispatcher.dispatch(event);
            } else {
                springDispatcher.dispatch(event);
            }
        } finally {
            sample.stop(meterRegistry.timer("fstpay.dispatcher.publish.duration"));
        }
    }
}
