package com.fstpay.common.event;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class AnalyticsEventListener {

    private final MeterRegistry meterRegistry;

    private void increment(String counterName) {
        try {
            meterRegistry.counter(counterName).increment();
        } catch (Exception e) {
            log.warn("Failed to increment metric counter: {}", counterName, e);
        }
    }

    private void increment(String counterName, String... tags) {
        try {
            meterRegistry.counter(counterName, tags).increment();
        } catch (Exception e) {
            log.warn("Failed to increment metric counter: {}", counterName, e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleMoneyTransferred(MoneyTransferredEvent event) {
        log.info("Handling analytics for MoneyTransferredEvent");
        increment("fstpay.wallet.transfers.total");
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleParentInvitationAccepted(ParentInvitationAcceptedEvent event) {
        log.info("Handling analytics for ParentInvitationAcceptedEvent");
        increment("fstpay.parent.invitations.accepted.total");
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleApprovalRequested(ApprovalRequestedEvent event) {
        log.info("Handling analytics for ApprovalRequestedEvent");
        increment("fstpay.approvals.requested.total");
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleParentApprovalGranted(ParentApprovalGrantedEvent event) {
        log.info("Handling analytics for ParentApprovalGrantedEvent");
        increment("fstpay.approvals.decisions.total", "decision", "APPROVED");
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleParentApprovalRejected(ParentApprovalRejectedEvent event) {
        log.info("Handling analytics for ParentApprovalRejectedEvent");
        increment("fstpay.approvals.decisions.total", "decision", "REJECTED");
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleGoalCompleted(GoalCompletedEvent event) {
        log.info("Handling analytics for GoalCompletedEvent");
        increment("fstpay.goals.completed.total");
    }
}
