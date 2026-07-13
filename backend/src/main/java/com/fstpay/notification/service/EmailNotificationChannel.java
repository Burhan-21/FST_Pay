package com.fstpay.notification.service;

import com.fstpay.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailNotificationChannel implements NotificationChannel {

    private final EmailService emailService;

    @Override
    public boolean supports(String channelType) {
        return "EMAIL".equalsIgnoreCase(channelType);
    }

    @Override
    public void send(Notification notification) {
        emailService.sendSecurityAlertEmail(notification.getRecipient().getEmail(), 
                String.format("%s: %s", notification.getTitle(), notification.getMessage()));
        log.info("Notification email sent to: {}", notification.getRecipient().getEmail());
    }
}
