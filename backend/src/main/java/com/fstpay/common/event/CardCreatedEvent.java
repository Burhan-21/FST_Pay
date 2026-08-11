package com.fstpay.common.event;

import com.fstpay.user.entity.User;
import java.math.BigDecimal;
import java.util.UUID;

public record CardCreatedEvent(
    EventMetadata metadata,
    UserSnapshot user,
    UUID cardId,
    String cardHolder,
    String cardDesign,
    BigDecimal spendingLimit
) implements DomainEvent {
    public static CardCreatedEvent create(User user, UUID cardId, String cardHolder, String cardDesign, BigDecimal spendingLimit) {
        return new CardCreatedEvent(
            EventMetadata.create("CardCreatedEvent"),
            UserSnapshot.from(user),
            cardId,
            cardHolder,
            cardDesign,
            spendingLimit
        );
    }

    @Override
    public String aggregateType() {
        return "Card";
    }

    @Override
    public String aggregateId() {
        return cardId.toString();
    }
}
