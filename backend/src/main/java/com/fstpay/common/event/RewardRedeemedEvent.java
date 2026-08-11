package com.fstpay.common.event;

import com.fstpay.user.entity.User;
import java.util.UUID;

public record RewardRedeemedEvent(
    EventMetadata metadata,
    UserSnapshot user,
    UUID redemptionId,
    String itemTitle,
    int costPoints
) implements DomainEvent {
    public static RewardRedeemedEvent create(User user, UUID redemptionId, String itemTitle, int costPoints) {
        return new RewardRedeemedEvent(
            EventMetadata.create("RewardRedeemedEvent"),
            UserSnapshot.from(user),
            redemptionId,
            itemTitle,
            costPoints
        );
    }
}
