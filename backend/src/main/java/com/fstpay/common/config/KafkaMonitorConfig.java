package com.fstpay.common.config;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;

import jakarta.annotation.PostConstruct;

@Configuration
@RequiredArgsConstructor
public class KafkaMonitorConfig {

    private final ConcurrentKafkaListenerContainerFactory<?, ?> kafkaListenerContainerFactory;
    private final MeterRegistry meterRegistry;

    @PostConstruct
    public void configureKafkaMetrics() {
        // Spring Boot automatically registers KafkaClientMetrics for factories on the classpath.
        // We explicitly enable observation on the listener container factory to enable tracing and metrics context propagation.
        kafkaListenerContainerFactory.getContainerProperties().setObservationEnabled(true);
    }
}
