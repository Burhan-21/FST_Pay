package com.fstpay.common.event;

import com.fstpay.user.entity.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.math.BigDecimal;

@Getter
public class PocketMoneyTransferredEvent extends ApplicationEvent {
    private final User parent;
    private final User child;
    private final BigDecimal amount;
    private final String referenceId;
    private final String description;

    public PocketMoneyTransferredEvent(Object source, User parent, User child, BigDecimal amount, String referenceId, String description) {
        super(source);
        this.parent = parent;
        this.child = child;
        this.amount = amount;
        this.referenceId = referenceId;
        this.description = description;
    }
}
