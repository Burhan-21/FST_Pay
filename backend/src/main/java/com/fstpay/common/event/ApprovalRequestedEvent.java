package com.fstpay.common.event;

import com.fstpay.user.entity.User;
import java.math.BigDecimal;

public record ApprovalRequestedEvent(
    EventMetadata metadata,
    UserSnapshot parent,
    UserSnapshot child,
    String requestType,
    BigDecimal amount,
    String merchant,
    String description
) implements DomainEvent {
    public static ApprovalRequestedEvent create(User parent, User child, String requestType, BigDecimal amount, String merchant, String description) {
        return new ApprovalRequestedEvent(
            EventMetadata.create("ApprovalRequestedEvent"),
            UserSnapshot.from(parent),
            UserSnapshot.from(child),
            requestType,
            amount,
            merchant,
            description
        );
    }
}
