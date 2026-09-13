package com.fstpay.parent.service;

import com.fstpay.common.event.ApprovalRequestedEvent;
import com.fstpay.common.event.EventPublisher;
import com.fstpay.common.event.ParentApprovalGrantedEvent;
import com.fstpay.common.event.ParentApprovalRejectedEvent;
import com.fstpay.common.exception.BadRequestException;
import com.fstpay.parent.dto.ApprovalDecisionRequest;
import com.fstpay.parent.dto.SpendApprovalRequest;
import com.fstpay.parent.entity.ParentChildLink;
import com.fstpay.parent.entity.TransactionApproval;
import com.fstpay.parent.repository.ParentChildLinkRepository;
import com.fstpay.parent.repository.TransactionApprovalRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApprovalServiceTest {

    @Mock
    private TransactionApprovalRepository approvalRepository;
    @Mock
    private ParentChildLinkRepository linkRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ParentLinkService parentLinkService;
    @Mock
    private EventPublisher eventPublisher;
    @Mock
    private ApprovalProcessor approvalProcessor;

    private ApprovalService approvalService;

    private User parent;
    private User child;
    private ParentChildLink link;

    @BeforeEach
    void setUp() {
        approvalService = new ApprovalService(
                approvalRepository,
                linkRepository,
                userRepository,
                parentLinkService,
                eventPublisher,
                approvalProcessor
        );

        parent = User.builder()
                .id(UUID.randomUUID())
                .email("parent@example.com")
                .fullName("Parent Doe")
                .role("PARENT")
                .build();

        child = User.builder()
                .id(UUID.randomUUID())
                .email("child@example.com")
                .fullName("Child Doe")
                .role("USER")
                .build();

        link = ParentChildLink.builder()
                .id(UUID.randomUUID())
                .parent(parent)
                .child(child)
                .status("ACTIVE")
                .relationship("FATHER")
                .build();
    }

    @Test
    void requestApproval_Success() {
        when(userRepository.findByEmail("child@example.com")).thenReturn(Optional.of(child));
        when(linkRepository.findByChildIdAndStatus(child.getId(), "ACTIVE")).thenReturn(Optional.of(link));
        when(approvalRepository.save(any(TransactionApproval.class))).thenAnswer(i -> i.getArgument(0));

        SpendApprovalRequest req = new SpendApprovalRequest();
        req.setRequestType("SPEND");
        req.setAmount(new BigDecimal("1500.00"));
        req.setCategory("ELECTRONICS");
        req.setMerchant("BestBuy");
        req.setDescription("Headphones");

        TransactionApproval approval = approvalService.requestApproval("child@example.com", req);

        assertNotNull(approval);
        assertEquals("PENDING", approval.getStatus());
        assertEquals("SPEND", approval.getRequestType());
        assertEquals(new BigDecimal("1500.00"), approval.getAmount());
        verify(eventPublisher, times(1)).publish(any(ApprovalRequestedEvent.class));
    }

    @Test
    void decideApproval_Approved_ExecutesProcessorAndPublishesEvent() {
        TransactionApproval approval = TransactionApproval.builder()
                .id(UUID.randomUUID())
                .child(child)
                .parent(parent)
                .requestType("SPEND")
                .amount(new BigDecimal("500.00"))
                .status("PENDING")
                .build();

        when(userRepository.findByEmail("parent@example.com")).thenReturn(Optional.of(parent));
        when(approvalRepository.findById(approval.getId())).thenReturn(Optional.of(approval));
        when(approvalRepository.save(any(TransactionApproval.class))).thenAnswer(i -> i.getArgument(0));

        ApprovalDecisionRequest decision = new ApprovalDecisionRequest();
        decision.setApproved(true);
        decision.setNote("Enjoy your purchase!");

        TransactionApproval decided = approvalService.decideApproval("parent@example.com", approval.getId(), decision);

        assertEquals("APPROVED", decided.getStatus());
        assertEquals("Enjoy your purchase!", decided.getParentNote());
        assertNotNull(decided.getDecidedAt());
        verify(approvalProcessor, times(1)).process(decided);
        verify(eventPublisher, times(1)).publish(any(ParentApprovalGrantedEvent.class));
    }

    @Test
    void decideApproval_Rejected_PublishesRejectedEventWithoutProcessor() {
        TransactionApproval approval = TransactionApproval.builder()
                .id(UUID.randomUUID())
                .child(child)
                .parent(parent)
                .requestType("SPEND")
                .amount(new BigDecimal("500.00"))
                .status("PENDING")
                .build();

        when(userRepository.findByEmail("parent@example.com")).thenReturn(Optional.of(parent));
        when(approvalRepository.findById(approval.getId())).thenReturn(Optional.of(approval));
        when(approvalRepository.save(any(TransactionApproval.class))).thenAnswer(i -> i.getArgument(0));

        ApprovalDecisionRequest decision = new ApprovalDecisionRequest();
        decision.setApproved(false);
        decision.setNote("Save money instead.");

        TransactionApproval decided = approvalService.decideApproval("parent@example.com", approval.getId(), decision);

        assertEquals("REJECTED", decided.getStatus());
        assertEquals("Save money instead.", decided.getParentNote());
        verify(approvalProcessor, never()).process(any());
        verify(eventPublisher, times(1)).publish(any(ParentApprovalRejectedEvent.class));
    }

    @Test
    void decideApproval_UnauthorizedParent_ThrowsException() {
        User otherParent = User.builder().id(UUID.randomUUID()).email("other@example.com").build();
        TransactionApproval approval = TransactionApproval.builder()
                .id(UUID.randomUUID())
                .child(child)
                .parent(parent)
                .status("PENDING")
                .build();

        when(userRepository.findByEmail("other@example.com")).thenReturn(Optional.of(otherParent));
        when(approvalRepository.findById(approval.getId())).thenReturn(Optional.of(approval));

        ApprovalDecisionRequest decision = new ApprovalDecisionRequest();
        decision.setApproved(true);

        assertThrows(BadRequestException.class,
                () -> approvalService.decideApproval("other@example.com", approval.getId(), decision));
    }

    @Test
    void getPendingApprovals_ReturnsList() {
        when(userRepository.findByEmail("parent@example.com")).thenReturn(Optional.of(parent));
        when(approvalRepository.findByParentIdAndStatusOrderByCreatedAtDesc(parent.getId(), "PENDING"))
                .thenReturn(List.of(TransactionApproval.builder().id(UUID.randomUUID()).status("PENDING").build()));

        List<TransactionApproval> list = approvalService.getPendingApprovals("parent@example.com");
        assertEquals(1, list.size());
    }
}
