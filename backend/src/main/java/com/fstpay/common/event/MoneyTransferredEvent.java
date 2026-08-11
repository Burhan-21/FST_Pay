package com.fstpay.common.event;

import com.fstpay.user.entity.User;
import java.math.BigDecimal;

public record MoneyTransferredEvent(
    EventMetadata metadata,
    UserSnapshot parent,
    UserSnapshot child,
    BigDecimal amount,
    String referenceId,
    String description
) implements DomainEvent {
    public static MoneyTransferredEvent create(User parent, User child, BigDecimal amount, String referenceId, String description) {
        return new MoneyTransferredEvent(
            EventMetadata.create("MoneyTransferredEvent"),
            UserSnapshot.from(parent),
            UserSnapshot.from(child),
            amount,
            referenceId,
            description
        );
    }

    @Override
    public String aggregateType() {
        return "Wallet";
    }

    @Override
    public String aggregateId() {
        return referenceId;
    }
}
