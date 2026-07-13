package com.fstpay.report.controller;

import com.fstpay.report.scheduler.MonthlyReportScheduler;
import com.fstpay.report.service.MonthlyReportService;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final MonthlyReportService monthlyReportService;
    private final MonthlyReportScheduler monthlyReportScheduler;
    private final UserRepository userRepository;

    @PostMapping("/monthly/request")
    public ResponseEntity<Map<String, String>> requestMonthlyReport(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Trigger email delivery asynchronously or synchronously
        monthlyReportService.sendMonthlyReportEmail(user);

        return ResponseEntity.ok(Map.of("message", "Monthly report has been successfully generated and sent to " + user.getEmail()));
    }

    @PostMapping("/monthly/trigger-all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> triggerAllMonthlyReports() {
        monthlyReportScheduler.generateAndSendMonthlyReports();
        return ResponseEntity.ok(Map.of("message", "Successfully triggered monthly report delivery process for all users."));
    }
}
