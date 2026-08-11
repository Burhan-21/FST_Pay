package com.fstpay.common.event;

import com.fstpay.notification.service.NotificationService;
import com.fstpay.notification.enums.NotificationType;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleMoneyTransferred(MoneyTransferredEvent event) {
        log.info("Handling MoneyTransferredEvent for parent: {}, child: {}", 
                event.parent().email(), event.child().email());

        User parent = userRepository.findById(event.parent().id()).orElse(null);
        User child = userRepository.findById(event.child().id()).orElse(null);

        if (parent != null && child != null) {
            // Notify Parent
            notificationService.sendNotification(
                    parent, 
                    child, 
                    NotificationType.POCKET_MONEY, 
                    "Pocket Money Sent 💸", 
                    String.format("You sent ₹%.2f pocket money to %s.", event.amount(), child.getFullName())
            );

            // Notify Child
            notificationService.sendNotification(
                    child, 
                    parent, 
                    NotificationType.POCKET_MONEY, 
                    "Pocket Money Received 💸", 
                    String.format("You received ₹%.2f pocket money from parent %s.", event.amount(), parent.getFullName())
            );
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleParentInvitationAccepted(ParentInvitationAcceptedEvent event) {
        log.info("Handling ParentInvitationAcceptedEvent for parent: {}, child: {}", 
                event.parent().email(), event.child().email());

        User parent = userRepository.findById(event.parent().id()).orElse(null);
        User child = userRepository.findById(event.child().id()).orElse(null);

        if (parent != null && child != null) {
            notificationService.sendNotification(
                    parent, 
                    child, 
                    NotificationType.SYSTEM, 
                    "Family Link Established 👪", 
                    String.format("You are now linked with your teenager, %s.", child.getFullName())
            );

            notificationService.sendNotification(
                    child, 
                    parent, 
                    NotificationType.SYSTEM, 
                    "Family Link Established 👪", 
                    String.format("Your parent %s has accepted the invitation and is now linked to your account.", parent.getFullName())
            );
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleApprovalRequested(ApprovalRequestedEvent event) {
        log.info("Handling ApprovalRequestedEvent for child: {}", event.child().email());

        User parent = userRepository.findById(event.parent().id()).orElse(null);
        User child = userRepository.findById(event.child().id()).orElse(null);

        if (parent != null && child != null) {
            String details = event.amount() != null 
                    ? String.format("₹%.2f for %s", event.amount(), event.merchant() != null ? event.merchant() : "purchase") 
                    : event.requestType();
            
            notificationService.sendNotification(
                    parent, 
                    child, 
                    NotificationType.APPROVAL_REQUEST, 
                    "Approval Needed ⚠️", 
                    String.format("%s requested approval for: %s.", child.getFullName(), details)
            );
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleParentApprovalGranted(ParentApprovalGrantedEvent event) {
        log.info("Handling ParentApprovalGrantedEvent for parent: {}, child: {}", 
                event.parent().email(), event.child().email());

        User parent = userRepository.findById(event.parent().id()).orElse(null);
        User child = userRepository.findById(event.child().id()).orElse(null);

        if (parent != null && child != null) {
            String details = event.amount() != null 
                    ? String.format("₹%.2f request", event.amount()) 
                    : event.requestType();

            // Notify child
            notificationService.sendNotification(
                    child, 
                    parent, 
                    NotificationType.APPROVAL_DECISION, 
                    "Request Approved ✅", 
                    String.format("Your parent %s has approved your request for %s.", parent.getFullName(), details)
            );

            // Notify parent confirmation
            notificationService.sendNotification(
                    parent, 
                    child, 
                    NotificationType.APPROVAL_DECISION, 
                    "Request Approved ✅", 
                    String.format("You have approved the %s request for %s.", details, child.getFullName())
            );
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleParentApprovalRejected(ParentApprovalRejectedEvent event) {
        log.info("Handling ParentApprovalRejectedEvent for parent: {}, child: {}", 
                event.parent().email(), event.child().email());

        User parent = userRepository.findById(event.parent().id()).orElse(null);
        User child = userRepository.findById(event.child().id()).orElse(null);

        if (parent != null && child != null) {
            String details = event.amount() != null 
                    ? String.format("₹%.2f request", event.amount()) 
                    : event.requestType();

            // Notify child
            notificationService.sendNotification(
                    child, 
                    parent, 
                    NotificationType.APPROVAL_DECISION, 
                    "Request Rejected ❌", 
                    String.format("Your parent %s has rejected your request for %s.", parent.getFullName(), details)
            );

            // Notify parent confirmation
            notificationService.sendNotification(
                    parent, 
                    child, 
                    NotificationType.APPROVAL_DECISION, 
                    "Request Rejected ❌", 
                    String.format("You have rejected the %s request for %s.", details, child.getFullName())
            );
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleWalletFunded(WalletFundedEvent event) {
        log.info("Handling WalletFundedEvent for user: {}", event.user().email());

        User user = userRepository.findById(event.user().id()).orElse(null);
        if (user != null) {
            notificationService.sendNotification(
                    user, 
                    null, 
                    NotificationType.SYSTEM, 
                    "Wallet Funded 💰", 
                    String.format("Successfully topped up ₹%.2f via %s. Reference: %s", 
                            event.amount(), event.method(), event.referenceId())
            );
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleGoalCompleted(GoalCompletedEvent event) {
        log.info("Handling GoalCompletedEvent for user: {}", event.user().email());

        User user = userRepository.findById(event.user().id()).orElse(null);
        if (user != null) {
            notificationService.sendNotification(
                    user, 
                    null, 
                    NotificationType.GOAL_COMPLETED, 
                    "Savings Goal Completed! 🎯", 
                    String.format("Congratulations! You've reached your target of ₹%.2f for '%s'!", 
                            event.targetAmount(), event.goalName())
            );
        }
    }
}
