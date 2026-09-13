package com.fstpay.goal.dto;

import com.fstpay.goal.entity.WalletGoal;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoalResponse {
    private UUID id;
    private String name;
    private String description;
    private BigDecimal targetAmount;
    private BigDecimal currentAmount;
    private BigDecimal allocatedAmount;
    private BigDecimal withdrawnAmount;
    private LocalDate targetDate;
    private String priority;
    private String icon;
    private String color;
    private String status;
    private Instant completedAt;
    private Instant cancelledAt;
    private Boolean roundUpEnabled;
    private Integer roundUpNearest;
    private BigDecimal roundUpAccumulated;
    private Instant createdAt;
    private Instant updatedAt;

    public static GoalResponse fromEntity(WalletGoal goal) {
        if (goal == null) return null;
        return GoalResponse.builder()
                .id(goal.getId())
                .name(goal.getName())
                .description(goal.getDescription())
                .targetAmount(goal.getTargetAmount())
                .currentAmount(goal.getCurrentAmount())
                .allocatedAmount(goal.getAllocatedAmount())
                .withdrawnAmount(goal.getWithdrawnAmount())
                .targetDate(goal.getTargetDate())
                .priority(goal.getPriority())
                .icon(goal.getIcon())
                .color(goal.getColor())
                .status(goal.getStatus())
                .completedAt(goal.getCompletedAt())
                .cancelledAt(goal.getCancelledAt())
                .roundUpEnabled(goal.getRoundUpEnabled())
                .roundUpNearest(goal.getRoundUpNearest())
                .roundUpAccumulated(goal.getRoundUpAccumulated())
                .createdAt(goal.getCreatedAt())
                .updatedAt(goal.getUpdatedAt())
                .build();
    }
}
