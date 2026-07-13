package com.fstpay.notification.service;

import com.fstpay.notification.entity.Notification;
import com.fstpay.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DatabaseNotificationChannel implements NotificationChannel {

    private final NotificationRepository notificationRepository;

    @Override
    public boolean supports(String channelType) {
        return "DATABASE".equalsIgnoreCase(channelType);
    }

    @Override
    public void send(Notification notification) {
        notificationRepository.save(notification);
        log.info("Notification saved to DB for recipient: {}", notification.getRecipient().getEmail());
    }
}
