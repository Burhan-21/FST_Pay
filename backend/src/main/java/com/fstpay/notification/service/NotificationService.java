package com.fstpay.notification.service;

import com.fstpay.notification.entity.Notification;
import com.fstpay.notification.entity.NotificationPreference;
import com.fstpay.notification.enums.NotificationType;
import com.fstpay.notification.repository.NotificationPreferenceRepository;
import com.fstpay.notification.repository.NotificationRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;
    private final List<NotificationChannel> channels;
    private final io.micrometer.core.instrument.MeterRegistry meterRegistry;

    @Transactional
    public void sendNotification(User recipient, User sender, NotificationType type, String title, String message) {
        log.info("Sending notification of type {} to {}", type, recipient.getEmail());

        // Increment notifications metric
        meterRegistry.counter("fstpay.notifications.sent.total", "type", type.name()).increment();

        // Create notification object
        Notification notification = Notification.builder()
                .recipient(recipient)
                .sender(sender)
                .type(type)
                .title(title)
                .message(message)
                .isRead(false)
                .build();

        // 1. Always save to Database (In-App Feed)
        for (NotificationChannel channel : channels) {
            if (channel.supports("DATABASE")) {
                channel.send(notification);
            }
        }

        // 2. Fetch or create preferences for recipient
        NotificationPreference preference = preferenceRepository
                .findByUserIdAndNotificationType(recipient.getId(), type)
                .orElseGet(() -> NotificationPreference.builder()
                        .user(recipient)
                        .notificationType(type)
                        .emailEnabled(true)
                        .pushEnabled(true)
                        .build());

        // 3. Send via Email if enabled
        if (Boolean.TRUE.equals(preference.getEmailEnabled())) {
            for (NotificationChannel channel : channels) {
                if (channel.supports("EMAIL")) {
                    channel.send(notification);
                }
            }
        }
    }

    public List<Notification> getNotificationsForUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId());
    }

    public List<NotificationPreference> getPreferences(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return preferenceRepository.findByUserId(user.getId());
    }

    @Transactional
    public void updatePreference(String email, NotificationType type, boolean emailEnabled, boolean pushEnabled) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        NotificationPreference preference = preferenceRepository
                .findByUserIdAndNotificationType(user.getId(), type)
                .orElse(NotificationPreference.builder()
                        .user(user)
                        .notificationType(type)
                        .build());

        preference.setEmailEnabled(emailEnabled);
        preference.setPushEnabled(pushEnabled);
        preferenceRepository.save(preference);
        log.info("Updated preference for user {}, type {}: email={}, push={}", email, type, emailEnabled, pushEnabled);
    }

    @Transactional
    public void markAllAsRead(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<Notification> unread = notificationRepository.findByRecipientIdAndIsReadOrderByCreatedAtDesc(user.getId(), false);
        for (Notification n : unread) {
            n.setIsRead(true);
        }
        notificationRepository.saveAll(unread);
        log.info("Marked all notifications read for user: {}", email);
    }
}
