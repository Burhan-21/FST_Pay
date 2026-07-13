package com.fstpay.report.scheduler;

import com.fstpay.report.service.MonthlyReportService;
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
public class MonthlyReportScheduler {

    private final UserRepository userRepository;
    private final MonthlyReportService monthlyReportService;

    /**
     * Run on the 1st of every month at midnight.
     */
    @Scheduled(cron = "0 0 0 1 * *")
    public void generateAndSendMonthlyReports() {
        log.info("Starting scheduled job: generateAndSendMonthlyReports");
        List<User> users = userRepository.findAll();

        int sentCount = 0;
        for (User user : users) {
            // Only send monthly reports to TEENS/USERS, not ADMINS or parents (unless requested)
            if ("USER".equalsIgnoreCase(user.getRole())) {
                try {
                    monthlyReportService.sendMonthlyReportEmail(user);
                    sentCount++;
                } catch (Exception e) {
                    log.error("Failed to send scheduled monthly report to user {}: {}", user.getEmail(), e.getMessage());
                }
            }
        }
        log.info("Scheduled job completed. Sent monthly reports to {} users.", sentCount);
    }
}
