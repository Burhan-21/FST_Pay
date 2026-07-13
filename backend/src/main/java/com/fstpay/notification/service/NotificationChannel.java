package com.fstpay.notification.service;

import com.fstpay.notification.entity.Notification;

public interface NotificationChannel {
    boolean supports(String channelType); // e.g. "DATABASE", "EMAIL"
    void send(Notification notification);
}
