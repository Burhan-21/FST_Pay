package com.fstpay.common.event;

import com.fstpay.user.entity.User;
import java.util.UUID;

public record CardFrozenEvent(
    EventMetadata metadata,
    UserSnapshot user,
    UUID cardId
) implements DomainEvent {
    public static CardFrozenEvent create(User user, UUID cardId) {
        return new CardFrozenEvent(
            EventMetadata.create("CardFrozenEvent"),
            UserSnapshot.from(user),
            cardId
        );
    }
}
