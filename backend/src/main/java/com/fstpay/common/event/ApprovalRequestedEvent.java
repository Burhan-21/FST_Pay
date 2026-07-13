package com.fstpay.common.event;

import com.fstpay.user.entity.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.math.BigDecimal;

@Getter
public class ApprovalRequestedEvent extends ApplicationEvent {
    private final User parent;
    private final User child;
    private final String requestType;
    private final BigDecimal amount;
    private final String merchant;
    private final String description;

    public ApprovalRequestedEvent(Object source, User parent, User child, String requestType, BigDecimal amount, String merchant, String description) {
        super(source);
        this.parent = parent;
        this.child = child;
        this.requestType = requestType;
        this.amount = amount;
        this.merchant = merchant;
        this.description = description;
    }
}
