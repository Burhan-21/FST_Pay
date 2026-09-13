package com.fstpay.parent.policy;

import com.fstpay.common.event.ApprovalRequestedEvent;
import com.fstpay.common.event.EventPublisher;
import com.fstpay.parent.entity.ParentChildLink;
import com.fstpay.parent.entity.TransactionApproval;
import com.fstpay.parent.repository.ParentChildLinkRepository;
import com.fstpay.parent.repository.TransactionApprovalRepository;
import com.fstpay.user.entity.User;
import com.fstpay.wallet.api.WalletDailySummaryOperations;
import com.fstpay.wallet.entity.Wallet;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ParentalControlPolicyTest {

    @Mock
    private TransactionApprovalRepository approvalRepository;
    @Mock
    private ParentChildLinkRepository parentChildLinkRepository;
    @Mock
    private WalletDailySummaryOperations summaryService;
    @Mock
    private EventPublisher eventPublisher;

    private ParentalControlPolicy policy;

    private User teen;
    private User parent;
    private Wallet wallet;
    private ParentChildLink link;

    @BeforeEach
    void setUp() {
        policy = new ParentalControlPolicy(approvalRepository, parentChildLinkRepository, summaryService, eventPublisher);

        parent = User.builder()
                .id(UUID.randomUUID())
                .email("parent@example.com")
                .fullName("Parent Doe")
                .role("PARENT")
                .build();

        teen = User.builder()
                .id(UUID.randomUUID())
                .email("teen@example.com")
                .fullName("Teen Doe")
                .role("USER")
                .parentalControlEnabled(true)
                .parentalMaxTxnAmount(new BigDecimal("1000.00"))
                .parentalDailyLimit(new BigDecimal("2000.00"))
                .parentalRestrictedCategories("GAMING,ALCOHOL")
                .build();

        wallet = Wallet.builder()
                .id(UUID.randomUUID())
                .user(teen)
                .balance(new BigDecimal("5000.00"))
                .isActive(true)
                .build();

        link = ParentChildLink.builder()
                .id(UUID.randomUUID())
                .parent(parent)
                .child(teen)
                .relationship("MOTHER")
                .status("ACTIVE")
                .build();
    }

    @Test
    void evaluate_WhenParentalControlDisabled_ReturnsAllowed() {
        teen.setParentalControlEnabled(false);

        ParentalPolicyResult result = policy.evaluate(
                teen, wallet, new BigDecimal("5000.00"), "GAMING", "Steam", "Game"
        );

        assertTrue(result.isAllowed());
        assertEquals("Parental controls disabled", result.getReason());
        verifyNoInteractions(approvalRepository, parentChildLinkRepository, eventPublisher);
    }

    @Test
    void evaluate_WhenActivePreApprovalMatches_ReturnsAllowedAndCompletesApproval() {
        TransactionApproval existingApproval = TransactionApproval.builder()
                .id(UUID.randomUUID())
                .child(teen)
                .parent(parent)
                .amount(new BigDecimal("1500.00"))
                .category("GAMING")
                .status("APPROVED")
                .build();

        when(approvalRepository.findByChildIdAndStatusOrderByCreatedAtDesc(teen.getId(), "APPROVED"))
                .thenReturn(List.of(existingApproval));

        ParentalPolicyResult result = policy.evaluate(
                teen, wallet, new BigDecimal("1200.00"), "GAMING", "Steam", "Game purchase"
        );

        assertTrue(result.isAllowed());
        assertTrue(result.getReason().contains("Bypassed parental control: Approved by parent"));
        assertEquals("COMPLETED", existingApproval.getStatus());
        verify(approvalRepository, times(1)).save(existingApproval);
    }

    @Test
    void evaluate_WhenRestrictedCategoryAndParentLinked_ReturnsRequiresApproval() {
        when(approvalRepository.findByChildIdAndStatusOrderByCreatedAtDesc(teen.getId(), "APPROVED"))
                .thenReturn(Collections.emptyList());
        when(parentChildLinkRepository.findByChildIdAndStatus(teen.getId(), "ACTIVE"))
                .thenReturn(Optional.of(link));
        when(approvalRepository.save(any(TransactionApproval.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ParentalPolicyResult result = policy.evaluate(
                teen, wallet, new BigDecimal("300.00"), "GAMING", "PlayStation Store", "Game"
        );

        assertTrue(result.isRequiresApproval());
        assertNotNull(result.getApproval());
        assertEquals("PENDING", result.getApproval().getStatus());
        assertEquals("SPEND", result.getApproval().getRequestType());
        assertEquals(new BigDecimal("300.00"), result.getApproval().getAmount());
        assertEquals("GAMING", result.getApproval().getCategory());

        ArgumentCaptor<ApprovalRequestedEvent> captor = ArgumentCaptor.forClass(ApprovalRequestedEvent.class);
        verify(eventPublisher, times(1)).publish(captor.capture());
        assertEquals("parent@example.com", captor.getValue().parent().email());
    }

    @Test
    void evaluate_WhenRestrictedCategoryAndNoParentLinked_ReturnsRejected() {
        when(approvalRepository.findByChildIdAndStatusOrderByCreatedAtDesc(teen.getId(), "APPROVED"))
                .thenReturn(Collections.emptyList());
        when(parentChildLinkRepository.findByChildIdAndStatus(teen.getId(), "ACTIVE"))
                .thenReturn(Optional.empty());

        ParentalPolicyResult result = policy.evaluate(
                teen, wallet, new BigDecimal("300.00"), "GAMING", "PlayStation Store", "Game"
        );

        assertTrue(result.isRejected());
        assertTrue(result.getReason().contains("no active parent account is linked"));
        assertNull(result.getApproval());
        verify(eventPublisher, never()).publish(any());
    }

    @Test
    void evaluate_WhenMaxTxnLimitExceeded_ReturnsRequiresApproval() {
        when(approvalRepository.findByChildIdAndStatusOrderByCreatedAtDesc(teen.getId(), "APPROVED"))
                .thenReturn(Collections.emptyList());
        when(parentChildLinkRepository.findByChildIdAndStatus(teen.getId(), "ACTIVE"))
                .thenReturn(Optional.of(link));
        when(approvalRepository.save(any(TransactionApproval.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // Max limit is 1000, requesting 1500 for allowed category FOOD
        ParentalPolicyResult result = policy.evaluate(
                teen, wallet, new BigDecimal("1500.00"), "FOOD", "Restaurant", "Dinner"
        );

        assertTrue(result.isRequiresApproval());
        assertTrue(result.getReason().contains("Exceeds max transaction limit of ₹1000.00"));
        verify(eventPublisher, times(1)).publish(any(ApprovalRequestedEvent.class));
    }

    @Test
    void evaluate_WhenDailyLimitExceeded_ReturnsRequiresApproval() {
        when(approvalRepository.findByChildIdAndStatusOrderByCreatedAtDesc(teen.getId(), "APPROVED"))
                .thenReturn(Collections.emptyList());
        when(parentChildLinkRepository.findByChildIdAndStatus(teen.getId(), "ACTIVE"))
                .thenReturn(Optional.of(link));
        when(approvalRepository.save(any(TransactionApproval.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // Daily limit 2000, already spent 1500, requesting 800 (total 2300 > 2000)
        when(summaryService.getSpentAmountBetween(eq(wallet.getId()), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(new BigDecimal("1500.00"));

        ParentalPolicyResult result = policy.evaluate(
                teen, wallet, new BigDecimal("800.00"), "FOOD", "Cafe", "Snacks"
        );

        assertTrue(result.isRequiresApproval());
        assertTrue(result.getReason().contains("Exceeds daily limit of ₹2000.00"));
    }

    @Test
    void evaluate_WhenAllChecksPass_ReturnsAllowed() {
        when(approvalRepository.findByChildIdAndStatusOrderByCreatedAtDesc(teen.getId(), "APPROVED"))
                .thenReturn(Collections.emptyList());
        when(summaryService.getSpentAmountBetween(eq(wallet.getId()), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(BigDecimal.ZERO);

        // Max 1000, requesting 400 for category FOOD
        ParentalPolicyResult result = policy.evaluate(
                teen, wallet, new BigDecimal("400.00"), "FOOD", "Subway", "Lunch"
        );

        assertTrue(result.isAllowed());
        assertEquals("All parental control checks passed", result.getReason());
        verify(approvalRepository, never()).save(any());
        verify(eventPublisher, never()).publish(any());
    }
}
