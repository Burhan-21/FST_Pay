package com.fstpay.common.event;

import com.fstpay.user.entity.User;
import java.math.BigDecimal;

public record ParentApprovalRejectedEvent(
    EventMetadata metadata,
    UserSnapshot parent,
    UserSnapshot child,
    String requestType,
    BigDecimal amount
) implements DomainEvent {
    public static ParentApprovalRejectedEvent create(User parent, User child, String requestType, BigDecimal amount) {
        return new ParentApprovalRejectedEvent(
            EventMetadata.create("ParentApprovalRejectedEvent"),
            UserSnapshot.from(parent),
            UserSnapshot.from(child),
            requestType,
            amount
        );
    }
}
