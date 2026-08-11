package com.fstpay.common.event;

import com.fstpay.user.entity.User;
import java.math.BigDecimal;

public record WalletFundedEvent(
    EventMetadata metadata,
    UserSnapshot user,
    BigDecimal amount,
    String method,
    String referenceId
) implements DomainEvent {
    public static WalletFundedEvent create(User user, BigDecimal amount, String method, String referenceId) {
        return new WalletFundedEvent(
            EventMetadata.create("WalletFundedEvent"),
            UserSnapshot.from(user),
            amount,
            method,
            referenceId
        );
    }
}
