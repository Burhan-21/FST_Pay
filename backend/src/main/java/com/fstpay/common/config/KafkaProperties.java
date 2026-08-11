package com.fstpay.common.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.kafka")
@Getter
@Setter
public class KafkaProperties {

    /**
     * Bootstrap servers list for Apache Kafka broker connection.
     */
    private String bootstrapServers = "localhost:9092";

    /**
     * Consumer group ID for FST Pay listeners.
     */
    private String consumerGroupId = "fstpay-group";

    /**
     * Retention days for keeping processed events in DB log.
     */
    private int retentionDays = 7;

    /**
     * Batch size for periodic deletion of processed events.
     */
    private int cleanupBatchSize = 100;
}
