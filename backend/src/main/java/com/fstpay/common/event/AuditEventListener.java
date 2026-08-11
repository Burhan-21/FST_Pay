package com.fstpay.common.event;

import com.fstpay.audit.service.AuditService;
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
public class AuditEventListener {

    private final UserRepository userRepository;
    private final AuditService auditService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleMoneyTransferred(MoneyTransferredEvent event) {
        log.info("Auditing MoneyTransferredEvent");

        User parent = userRepository.findById(event.parent().id()).orElse(null);
        User child = userRepository.findById(event.child().id()).orElse(null);

        if (parent != null && child != null) {
            auditService.log(parent, "POCKET_MONEY_SENT", 
                    String.format("Sent pocket money: ₹%.2f to child %s (Ref: %s)", 
                            event.amount(), child.getFullName(), event.referenceId()));
            
            auditService.log(child, "POCKET_MONEY_RECEIVED", 
                    String.format("Received pocket money: ₹%.2f from parent %s (Ref: %s)", 
                            event.amount(), parent.getFullName(), event.referenceId()));
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleParentInvitationAccepted(ParentInvitationAcceptedEvent event) {
        log.info("Auditing ParentInvitationAcceptedEvent");

        User parent = userRepository.findById(event.parent().id()).orElse(null);
        User child = userRepository.findById(event.child().id()).orElse(null);

        if (parent != null && child != null) {
            auditService.log(parent, "INVITATION_ACCEPTED", 
                    String.format("Accepted invitation from child %s", child.getFullName()));
            
            auditService.log(child, "PARENT_LINKED", 
                    String.format("Parent %s linked successfully", parent.getFullName()));
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleApprovalRequested(ApprovalRequestedEvent event) {
        log.info("Auditing ApprovalRequestedEvent");

        User child = userRepository.findById(event.child().id()).orElse(null);

        if (child != null) {
            auditService.log(child, "APPROVAL_REQUESTED", 
                    String.format("Requested approval for type: %s, amount: %s, merchant: %s", 
                            event.requestType(), event.amount(), event.merchant()));
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleParentApprovalGranted(ParentApprovalGrantedEvent event) {
        log.info("Auditing ParentApprovalGrantedEvent");

        User parent = userRepository.findById(event.parent().id()).orElse(null);

        if (parent != null) {
            auditService.log(parent, "APPROVAL_DECIDED", 
                    String.format("Decided approval request: %s, action: APPROVED, amount: %s", 
                            event.requestType(), event.amount()));
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleParentApprovalRejected(ParentApprovalRejectedEvent event) {
        log.info("Auditing ParentApprovalRejectedEvent");

        User parent = userRepository.findById(event.parent().id()).orElse(null);

        if (parent != null) {
            auditService.log(parent, "APPROVAL_DECIDED", 
                    String.format("Decided approval request: %s, action: REJECTED, amount: %s", 
                            event.requestType(), event.amount()));
        }
    }
}
