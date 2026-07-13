package com.fstpay.parent.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ParentNotificationDto {
    private UUID id;
    private String type;
    private String title;
    private String message;
    private Boolean isRead;
    private Instant createdAt;
    private UUID childId;
    private String childName;
}
