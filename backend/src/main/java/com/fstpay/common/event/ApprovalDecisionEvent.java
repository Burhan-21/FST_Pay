package com.fstpay.common.event;

import com.fstpay.user.entity.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.math.BigDecimal;

@Getter
public class ApprovalDecisionEvent extends ApplicationEvent {
    private final User parent;
    private final User child;
    private final String requestType;
    private final BigDecimal amount;
    private final boolean approved;

    public ApprovalDecisionEvent(Object source, User parent, User child, String requestType, BigDecimal amount, boolean approved) {
        super(source);
        this.parent = parent;
        this.child = child;
        this.requestType = requestType;
        this.amount = amount;
        this.approved = approved;
    }
}
