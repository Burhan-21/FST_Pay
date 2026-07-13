package com.fstpay.common.event;

import com.fstpay.user.entity.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ParentInvitationAcceptedEvent extends ApplicationEvent {
    private final User parent;
    private final User child;
    private final String relationship;

    public ParentInvitationAcceptedEvent(Object source, User parent, User child, String relationship) {
        super(source);
        this.parent = parent;
        this.child = child;
        this.relationship = relationship;
    }
}
