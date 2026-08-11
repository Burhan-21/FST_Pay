package com.fstpay.common.outbox;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.outbox")
@Getter
@Setter
public class OutboxProperties {

    /**
     * Delay in milliseconds between background publisher polls.
     */
    private long publisherDelayMs = 1000;

    /**
     * Number of days to retain processed SENT events.
     */
    private int retentionDays = 7;

    /**
     * Batch size for deleting historical processed events.
     */
    private int cleanupBatchSize = 100;

    /**
     * Cron expression for scheduled outbox cleanup task. Default is midnight daily.
     */
    private String cleanupCron = "0 0 0 * * ?";

    /**
     * Threshold in seconds after which the health indicator considers the outbox stalled.
     */
    private long healthStallThresholdSeconds = 300;

    /**
     * Maximum number of attempts to try executing a failed event before dead-lettering it.
     */
    private int maxRetries = 5;

    /**
     * Dispatcher implementation type. Options: SPRING, KAFKA.
     */
    private DispatcherType dispatcherType = DispatcherType.SPRING;
}
