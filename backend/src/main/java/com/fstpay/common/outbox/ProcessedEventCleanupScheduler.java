package com.fstpay.common.outbox;

import com.fstpay.common.config.KafkaProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class ProcessedEventCleanupScheduler {

    private final ProcessedEventRepository processedEventRepository;
    private final KafkaProperties kafkaProperties;

    @Autowired
    @Lazy
    private ProcessedEventCleanupScheduler self;

    // Run cleanup daily at 1 AM.
    @Scheduled(cron = "${app.kafka.cleanup-cron:0 0 1 * * ?}")
    public void cleanupOldProcessedEvents() {
        int retentionDays = kafkaProperties.getRetentionDays();
        int batchSize = kafkaProperties.getCleanupBatchSize();
        log.info("Starting scheduled processed events cleanup (retentionDays={}, batchSize={}).", retentionDays, batchSize);

        try {
            int totalDeleted = 0;
            int deletedInBatch;
            do {
                deletedInBatch = self.deleteBatch(retentionDays, batchSize);
                totalDeleted += deletedInBatch;
            } while (deletedInBatch >= batchSize);

            log.info("Scheduled processed events cleanup completed. Total deleted: {}", totalDeleted);
        } catch (Exception e) {
            log.error("Error during scheduled processed events cleanup", e);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int deleteBatch(int retentionDays, int batchSize) {
        Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        List<ProcessedEvent> toDelete = processedEventRepository.findOldProcessedEvents(
                cutoff,
                org.springframework.data.domain.PageRequest.of(0, batchSize)
        );

        if (!toDelete.isEmpty()) {
            processedEventRepository.deleteAllInBatch(toDelete);
            log.debug("Cleaned up {} old processed events in a batch.", toDelete.size());
        }
        return toDelete.size();
    }
}
