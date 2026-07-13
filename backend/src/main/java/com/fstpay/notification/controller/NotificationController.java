package com.fstpay.notification.controller;

import com.fstpay.common.dto.ApiResponse;
import com.fstpay.notification.entity.Notification;
import com.fstpay.notification.entity.NotificationPreference;
import com.fstpay.notification.enums.NotificationType;
import com.fstpay.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Notification>>> getNotifications(Authentication authentication) {
        List<Notification> notifications = notificationService.getNotificationsForUser(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Notifications retrieved successfully", notifications));
    }

    @PostMapping("/read")
    public ResponseEntity<ApiResponse<Void>> markAllRead(Authentication authentication) {
        notificationService.markAllAsRead(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read", null));
    }

    @GetMapping("/preferences")
    public ResponseEntity<ApiResponse<List<NotificationPreference>>> getPreferences(Authentication authentication) {
        List<NotificationPreference> preferences = notificationService.getPreferences(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Notification preferences retrieved successfully", preferences));
    }

    @PutMapping("/preferences")
    public ResponseEntity<ApiResponse<Void>> updatePreference(
            @RequestParam NotificationType type,
            @RequestParam boolean emailEnabled,
            @RequestParam boolean pushEnabled,
            Authentication authentication) {
        notificationService.updatePreference(authentication.getName(), type, emailEnabled, pushEnabled);
        return ResponseEntity.ok(ApiResponse.success("Preference updated successfully", null));
    }
}
