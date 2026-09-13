package com.fstpay.parent.dto;

import com.fstpay.parent.enums.AllowanceFrequency;
import lombok.*;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduledAllowanceResponse {

    private UUID id;
    private UUID parentId;
    private String parentName;
    private UUID childId;
    private String childName;
    private String childEmail;
    private BigDecimal amount;
    private AllowanceFrequency frequency;
    private DayOfWeek dayOfWeek;
    private Integer dayOfMonth;
    private UUID targetGoalId;
    private String targetGoalName;
    private String note;
    private Boolean active;
    private LocalDate nextRunDate;
    private LocalDate lastRunDate;
    private Instant createdAt;
    private Instant updatedAt;
}
