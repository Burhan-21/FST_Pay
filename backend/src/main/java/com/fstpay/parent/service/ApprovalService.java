package com.fstpay.parent.service;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.common.event.ApprovalDecisionEvent;
import com.fstpay.common.event.ApprovalRequestedEvent;
import com.fstpay.parent.dto.ApprovalDecisionRequest;
import com.fstpay.parent.dto.SpendApprovalRequest;
import com.fstpay.parent.entity.ParentChildLink;
import com.fstpay.parent.entity.TransactionApproval;
import com.fstpay.parent.repository.ParentChildLinkRepository;
import com.fstpay.parent.repository.TransactionApprovalRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApprovalService {

    private final TransactionApprovalRepository transactionApprovalRepository;
    private final ParentChildLinkRepository parentChildLinkRepository;
    private final UserRepository userRepository;
    private final ParentLinkService parentLinkService;
    private final ApplicationEventPublisher eventPublisher;
    
    // Use Lazy to prevent circular reference if ApprovalProcessor calls ApprovalService
    @Lazy
    private final ApprovalProcessor approvalProcessor;

    @Transactional
    public TransactionApproval requestApproval(String childEmail, SpendApprovalRequest request) {
        User child = userRepository.findByEmail(childEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Child not found"));

        ParentChildLink link = parentChildLinkRepository.findByChildIdAndStatus(child.getId(), "ACTIVE")
                .orElseThrow(() -> new BadRequestException("You are not linked to a parent account. Approval cannot be requested."));

        User parent = link.getParent();

        TransactionApproval approval = TransactionApproval.builder()
                .child(child)
                .parent(parent)
                .requestType(request.getRequestType().toUpperCase().trim())
                .amount(request.getAmount())
                .category(request.getCategory() != null ? request.getCategory().toUpperCase().trim() : null)
                .merchant(request.getMerchant())
                .description(request.getDescription())
                .targetId(request.getTargetId())
                .status("PENDING")
                .build();

        TransactionApproval saved = transactionApprovalRepository.save(approval);

        // Publish Event (listened to for notifications, audits, etc.)
        eventPublisher.publishEvent(new ApprovalRequestedEvent(
                this, parent, child, saved.getRequestType(), saved.getAmount(), saved.getMerchant(), saved.getDescription()
        ));

        log.info("Child {} requested approval for {} from parent {}", childEmail, saved.getRequestType(), parent.getEmail());
        return saved;
    }

    @Transactional
    public TransactionApproval decideApproval(String parentEmail, UUID approvalId, ApprovalDecisionRequest request) {
        User parent = userRepository.findByEmail(parentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Parent not found"));

        TransactionApproval approval = transactionApprovalRepository.findById(approvalId)
                .orElseThrow(() -> new ResourceNotFoundException("Approval request not found"));

        if (!approval.getParent().getId().equals(parent.getId())) {
            throw new BadRequestException("Unauthorized access to this approval request");
        }

        if (!approval.getStatus().equals("PENDING")) {
            throw new BadRequestException("This approval request has already been decided (current status: " + approval.getStatus() + ")");
        }

        boolean approved = request.getApproved();
        approval.setStatus(approved ? "APPROVED" : "REJECTED");
        approval.setParentNote(request.getNote());
        approval.setDecidedAt(Instant.now());

        TransactionApproval saved = transactionApprovalRepository.save(approval);

        // Publish Event (handles notification sends)
        eventPublisher.publishEvent(new ApprovalDecisionEvent(
                this, parent, approval.getChild(), saved.getRequestType(), saved.getAmount(), approved
        ));

        // If approved, trigger execution of the requested transaction/action
        if (approved) {
            try {
                approvalProcessor.process(saved);
                log.info("Approval request {} executed successfully", approvalId);
            } catch (Exception e) {
                log.error("Failed to execute approved action: {}", e.getMessage());
                saved.setStatus("FAILED");
                saved.setParentNote(saved.getParentNote() + " (Failed to execute: " + e.getMessage() + ")");
                transactionApprovalRepository.save(saved);
                throw new BadRequestException("Request approved but execution failed: " + e.getMessage());
            }
        }

        return saved;
    }

    public List<TransactionApproval> getPendingApprovals(String parentEmail) {
        User parent = userRepository.findByEmail(parentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Parent not found"));
        return transactionApprovalRepository.findByParentIdAndStatusOrderByCreatedAtDesc(parent.getId(), "PENDING");
    }

    public List<TransactionApproval> getApprovalHistoryForParent(String parentEmail) {
        User parent = userRepository.findByEmail(parentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Parent not found"));
        return transactionApprovalRepository.findByParentIdOrderByCreatedAtDesc(parent.getId());
    }

    public List<TransactionApproval> getApprovalHistoryForChild(String childEmail) {
        User child = userRepository.findByEmail(childEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Child not found"));
        return transactionApprovalRepository.findByChildIdOrderByCreatedAtDesc(child.getId());
    }
}
