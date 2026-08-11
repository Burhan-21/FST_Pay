package com.fstpay.common.outbox;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;

@Configuration
public class MetricsConfig {

    private final MeterRegistry meterRegistry;
    private final OutboxEventRepository outboxEventRepository;

    public MetricsConfig(MeterRegistry meterRegistry, OutboxEventRepository outboxEventRepository) {
        this.meterRegistry = meterRegistry;
        this.outboxEventRepository = outboxEventRepository;
    }

    @PostConstruct
    public void registerMetrics() {
        Gauge.builder("fstpay.outbox.pending.total", outboxEventRepository,
                repo -> repo.countByStatus(OutboxStatus.PENDING))
                .description("Total number of pending outbox events")
                .register(meterRegistry);

        Gauge.builder("fstpay.outbox.failed.total", outboxEventRepository,
                repo -> repo.countByStatus(OutboxStatus.FAILED))
                .description("Total number of failed outbox events")
                .register(meterRegistry);

        Gauge.builder("fstpay.outbox.dead_letter.total", outboxEventRepository,
                repo -> repo.countByStatus(OutboxStatus.DEAD_LETTER))
                .description("Total number of dead letter outbox events")
                .register(meterRegistry);
    }
}
