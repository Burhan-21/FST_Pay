package com.fstpay.common.event;

import com.fstpay.audit.service.AuditService;
import com.fstpay.notification.service.NotificationService;
import com.fstpay.notification.enums.NotificationType;
import com.fstpay.reward.service.RewardsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DomainEventListener {

    private final NotificationService notificationService;
    private final AuditService auditService;
    private final RewardsService rewardsService;
    private final io.micrometer.core.instrument.MeterRegistry meterRegistry;

    @Async
    @EventListener
    public void handlePocketMoneyTransferred(PocketMoneyTransferredEvent event) {
        log.info("Handling PocketMoneyTransferredEvent for parent: {}, child: {}", 
                event.getParent().getEmail(), event.getChild().getEmail());

        // Increment transfers metric
        meterRegistry.counter("fstpay.wallet.transfers.total").increment();

        // 1. Audit trail logging
        auditService.log(event.getParent(), "POCKET_MONEY_SENT", 
                String.format("Sent pocket money: ₹%.2f to child %s (Ref: %s)", 
                        event.getAmount(), event.getChild().getFullName(), event.getReferenceId()));
        
        auditService.log(event.getChild(), "POCKET_MONEY_RECEIVED", 
                String.format("Received pocket money: ₹%.2f from parent %s (Ref: %s)", 
                        event.getAmount(), event.getParent().getFullName(), event.getReferenceId()));

        // 2. Trigger notifications
        // Notify Parent
        notificationService.sendNotification(
                event.getParent(), 
                event.getChild(), 
                NotificationType.POCKET_MONEY, 
                "Pocket Money Sent \uD83D\uDCB8", 
                String.format("You sent ₹%.2f pocket money to %s.", event.getAmount(), event.getChild().getFullName())
        );

        // Notify Child
        notificationService.sendNotification(
                event.getChild(), 
                event.getParent(), 
                NotificationType.POCKET_MONEY, 
                "Pocket Money Received \uD83D\uDCB8", 
                String.format("You received ₹%.2f pocket money from parent %s.", event.getAmount(), event.getParent().getFullName())
        );

        // 3. XP Reward for teenager (+5 XP, 0 points)
        rewardsService.addXp(event.getChild(), 5, "Received pocket money from parent");
    }

    @Async
    @EventListener
    public void handleParentInvitationAccepted(ParentInvitationAcceptedEvent event) {
        log.info("Handling ParentInvitationAcceptedEvent for parent: {}, child: {}", 
                event.getParent().getEmail(), event.getChild().getEmail());

        // Increment invitations metric
        meterRegistry.counter("fstpay.parent.invitations.accepted.total").increment();

        // 1. Audit trail logging
        auditService.log(event.getParent(), "INVITATION_ACCEPTED", 
                String.format("Accepted invitation from child %s", event.getChild().getFullName()));
        
        auditService.log(event.getChild(), "PARENT_LINKED", 
                String.format("Parent %s linked successfully", event.getParent().getFullName()));

        // 2. Trigger notifications
        notificationService.sendNotification(
                event.getParent(), 
                event.getChild(), 
                NotificationType.SYSTEM, 
                "Family Link Established \uD83D\uDC6A", 
                String.format("You are now linked with your teenager, %s.", event.getChild().getFullName())
        );

        notificationService.sendNotification(
                event.getChild(), 
                event.getParent(), 
                NotificationType.SYSTEM, 
                "Family Link Established \uD83D\uDC6A", 
                String.format("Your parent %s has accepted the invitation and is now linked to your account.", event.getParent().getFullName())
        );
    }

    @Async
    @EventListener
    public void handleApprovalRequested(ApprovalRequestedEvent event) {
        log.info("Handling ApprovalRequestedEvent for child: {}", event.getChild().getEmail());

        // Increment approval requests metric
        meterRegistry.counter("fstpay.approvals.requested.total").increment();

        // 1. Audit trail logging
        auditService.log(event.getChild(), "APPROVAL_REQUESTED", 
                String.format("Requested approval for type: %s, amount: %s, merchant: %s", 
                        event.getRequestType(), event.getAmount(), event.getMerchant()));

        // 2. Trigger notification to parent
        String details = event.getAmount() != null 
                ? String.format("₹%.2f for %s", event.getAmount(), event.getMerchant() != null ? event.getMerchant() : "purchase") 
                : event.getRequestType();
        
        notificationService.sendNotification(
                event.getParent(), 
                event.getChild(), 
                NotificationType.APPROVAL_REQUEST, 
                "Approval Needed \u26A0\uFE0F", 
                String.format("%s requested approval for: %s.", event.getChild().getFullName(), details)
        );
    }

    @Async
    @EventListener
    public void handleApprovalDecision(ApprovalDecisionEvent event) {
        log.info("Handling ApprovalDecisionEvent for parent: {}, child: {}", 
                event.getParent().getEmail(), event.getChild().getEmail());

        String decision = event.isApproved() ? "APPROVED" : "REJECTED";

        // Increment approvals decided metric with status tag
        meterRegistry.counter("fstpay.approvals.decisions.total", "decision", decision).increment();

        // 1. Audit trail logging
        auditService.log(event.getParent(), "APPROVAL_DECIDED", 
                String.format("Decided approval request: %s, action: %s, amount: %s", 
                        event.getRequestType(), decision, event.getAmount()));

        // 2. Trigger notification
        String title = event.isApproved() ? "Request Approved \u2705" : "Request Rejected \u274C";
        String decisionText = event.isApproved() ? "approved" : "rejected";
        String details = event.getAmount() != null ? String.format("₹%.2f request", event.getAmount()) : event.getRequestType();

        // Notify child
        notificationService.sendNotification(
                event.getChild(), 
                event.getParent(), 
                NotificationType.APPROVAL_DECISION, 
                title, 
                String.format("Your parent %s has %s your request for %s.", 
                        event.getParent().getFullName(), decisionText, details)
        );

        // Notify parent confirmation
        notificationService.sendNotification(
                event.getParent(), 
                event.getChild(), 
                NotificationType.APPROVAL_DECISION, 
                title, 
                String.format("You have %s the %s request for %s.", 
                        decisionText, details, event.getChild().getFullName())
        );
    }
}
