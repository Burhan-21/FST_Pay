package com.fstpay.common.event;

import com.fstpay.user.entity.User;
import java.math.BigDecimal;
import java.util.UUID;

public record GoalCompletedEvent(
    EventMetadata metadata,
    UserSnapshot user,
    UUID goalId,
    String goalName,
    BigDecimal targetAmount,
    int rewardPoints
) implements DomainEvent {
    public static GoalCompletedEvent create(User user, UUID goalId, String goalName, BigDecimal targetAmount, int rewardPoints) {
        return new GoalCompletedEvent(
            EventMetadata.create("GoalCompletedEvent"),
            UserSnapshot.from(user),
            goalId,
            goalName,
            targetAmount,
            rewardPoints
        );
    }

    @Override
    public String aggregateType() {
        return "Goal";
    }

    @Override
    public String aggregateId() {
        return goalId.toString();
    }
}
