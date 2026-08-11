package com.fstpay.common.event;

import com.fstpay.user.entity.User;

public record ParentInvitationAcceptedEvent(
    EventMetadata metadata,
    UserSnapshot parent,
    UserSnapshot child,
    String relationship
) implements DomainEvent {
    public static ParentInvitationAcceptedEvent create(User parent, User child, String relationship) {
        return new ParentInvitationAcceptedEvent(
            EventMetadata.create("ParentInvitationAcceptedEvent"),
            UserSnapshot.from(parent),
            UserSnapshot.from(child),
            relationship
        );
    }
}
