package com.fstpay.common.event;

import com.fstpay.user.entity.User;
import java.math.BigDecimal;

public record ParentApprovalGrantedEvent(
    EventMetadata metadata,
    UserSnapshot parent,
    UserSnapshot child,
    String requestType,
    BigDecimal amount
) implements DomainEvent {
    public static ParentApprovalGrantedEvent create(User parent, User child, String requestType, BigDecimal amount) {
        return new ParentApprovalGrantedEvent(
            EventMetadata.create("ParentApprovalGrantedEvent"),
            UserSnapshot.from(parent),
            UserSnapshot.from(child),
            requestType,
            amount
        );
    }
}
