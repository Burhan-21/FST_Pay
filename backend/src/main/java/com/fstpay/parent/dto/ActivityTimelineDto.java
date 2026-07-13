package com.fstpay.parent.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ActivityTimelineDto {
    private Instant timestamp;
    private String type; // SPEND, TRANSFER, CARD_FREEZE, CARD_UNFREEZE, APPROVAL_GRANTED, APPROVAL_REJECTED, GOAL_CREATED, REPORT_GENERATED
    private String title;
    private String description;
    private UUID childId;
    private String childName;
    private BigDecimal amount;
}
