package com.fstpay.aicoach.scheduler;

import com.fstpay.aicoach.service.AiCoachService;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiCoachScanScheduler {

    private final UserRepository userRepository;
    private final AiCoachService aiCoachService;

    /**
     * Runs scheduled proactive financial scans every Monday at 08:00 AM.
     * Configurable via 'app.ai.scan-cron' property.
     */
    @Scheduled(cron = "${app.ai.scan-cron:0 0 8 * * MON}")
    public void runWeeklyProactiveScans() {
        log.info("Starting scheduled job: runWeeklyProactiveScans");
        List<User> users = userRepository.findAll();

        int scannedUsers = 0;
        int detectedAnomalies = 0;

        for (User user : users) {
            // Only scan regular users/teens who have active spending accounts
            if ("USER".equalsIgnoreCase(user.getRole())) {
                try {
                    var anomalies = aiCoachService.runProactiveScan(user.getEmail());
                    scannedUsers++;
                    detectedAnomalies += anomalies.size();
                } catch (Exception e) {
                    log.error("Failed to run proactive scan for user {}: {}", user.getEmail(), e.getMessage());
                }
            }
        }

        log.info("Completed weekly proactive scans. Scanned {} users, generated {} anomaly alerts.", scannedUsers, detectedAnomalies);
    }
}
