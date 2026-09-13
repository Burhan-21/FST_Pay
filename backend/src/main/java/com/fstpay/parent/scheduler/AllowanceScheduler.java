package com.fstpay.parent.scheduler;

import com.fstpay.parent.service.ScheduledAllowanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AllowanceScheduler {

    private final ScheduledAllowanceService scheduledAllowanceService;

    /**
     * Daily sweep job executing all scheduled pocket money and goal auto-sweeps.
     * Defaults to 9:00 AM daily, configurable via 'app.allowance.sweep-cron'.
     */
    @Scheduled(cron = "${app.allowance.sweep-cron:0 0 9 * * *}")
    public void runDailyAllowanceSweeps() {
        log.info("Starting scheduled job: runDailyAllowanceSweeps");
        try {
            int processed = scheduledAllowanceService.executeAllDueAllowances();
            log.info("Finished daily allowance sweeps. Successfully processed {} schedules.", processed);
        } catch (Exception e) {
            log.error("Fatal error during daily allowance sweep execution: {}", e.getMessage(), e);
        }
    }
}
