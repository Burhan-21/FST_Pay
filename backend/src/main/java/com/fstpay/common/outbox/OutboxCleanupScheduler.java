package com.fstpay.common.outbox;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class OutboxCleanupScheduler {

    private final OutboxAdminService outboxAdminService;
    private final OutboxProperties outboxProperties;

    // Run cleanup once a day at midnight. Default cron runs daily.
    @Scheduled(cron = "${app.outbox.cleanup-cron:0 0 0 * * ?}")
    public void cleanupOldEvents() {
        int retentionDays = outboxProperties.getRetentionDays();
        int batchSize = outboxProperties.getCleanupBatchSize();
        log.info("Starting scheduled outbox cleanup (retentionDays={}, batchSize={}).", retentionDays, batchSize);
        try {
            int totalDeleted = 0;
            int deletedInBatch;
            do {
                deletedInBatch = outboxAdminService.cleanup(retentionDays, batchSize);
                totalDeleted += deletedInBatch;
            } while (deletedInBatch >= batchSize); // Keep cleaning in batches if there are more

            log.info("Scheduled outbox cleanup completed. Total deleted: {}", totalDeleted);
        } catch (Exception e) {
            log.error("Error during scheduled outbox cleanup", e);
        }
    }
}
