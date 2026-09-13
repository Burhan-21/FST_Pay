package com.fstpay.transaction.service;

import com.fstpay.common.event.DomainEvent;
import com.fstpay.common.event.EventPublisher;
import com.fstpay.common.event.MerchantSettlementEvent;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.notification.service.NotificationService;
import com.fstpay.transaction.dto.MerchantSettlementResponse;
import com.fstpay.transaction.dto.MerchantSettlementWebhookRequest;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.user.entity.User;
import com.fstpay.wallet.entity.Wallet;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MerchantSettlementServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private EventPublisher eventPublisher;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private MerchantSettlementService settlementService;

    private User user;
    private Wallet wallet;
    private Transaction transaction;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .fullName("Test User")
                .build();

        wallet = Wallet.builder()
                .id(UUID.randomUUID())
                .user(user)
                .balance(BigDecimal.valueOf(1000.00))
                .build();

        transaction = Transaction.builder()
                .id(UUID.randomUUID())
                .wallet(wallet)
                .amount(BigDecimal.valueOf(250.00))
                .balanceAfter(BigDecimal.valueOf(750.00))
                .type("DEBIT")
                .status("COMPLETED")
                .referenceId("REF_TXN_12345")
                .merchant("Amazon India")
                .createdAt(Instant.now())
                .build();
    }

    @Test
    void testProcessSettlement_Success() {
        MerchantSettlementWebhookRequest request = MerchantSettlementWebhookRequest.builder()
                .referenceId("REF_TXN_12345")
                .merchantId("MERCH_001")
                .settlementAmount(BigDecimal.valueOf(250.00))
                .currency("INR")
                .status("SETTLED")
                .settledAt(Instant.now())
                .build();

        when(transactionRepository.findByReferenceIdForUpdate("REF_TXN_12345"))
                .thenReturn(Optional.of(transaction));

        MerchantSettlementResponse response = settlementService.processSettlement(request);

        assertNotNull(response);
        assertEquals("SUCCESS", response.getStatus());
        assertEquals("SETTLED", response.getSettlementStatus());
        assertEquals("REF_TXN_12345", response.getReferenceId());

        assertEquals("SETTLED", transaction.getStatus());
        verify(transactionRepository).save(transaction);

        ArgumentCaptor<DomainEvent> eventCaptor = ArgumentCaptor.forClass(DomainEvent.class);
        verify(eventPublisher).publish(eventCaptor.capture());
        assertTrue(eventCaptor.getValue() instanceof MerchantSettlementEvent);

        MerchantSettlementEvent event = (MerchantSettlementEvent) eventCaptor.getValue();
        assertEquals(transaction.getId(), event.transactionId());
        assertEquals("SETTLED", event.status());
    }

    @Test
    void testProcessSettlement_IdempotentDuplicate_ReturnsIgnored() {
        transaction.setStatus("SETTLED");

        MerchantSettlementWebhookRequest request = MerchantSettlementWebhookRequest.builder()
                .referenceId("REF_TXN_12345")
                .merchantId("MERCH_001")
                .settlementAmount(BigDecimal.valueOf(250.00))
                .currency("INR")
                .status("SETTLED")
                .build();

        when(transactionRepository.findByReferenceIdForUpdate("REF_TXN_12345"))
                .thenReturn(Optional.of(transaction));

        MerchantSettlementResponse response = settlementService.processSettlement(request);

        assertNotNull(response);
        assertEquals("IGNORED_DUPLICATE", response.getStatus());
        assertEquals("SETTLED", response.getSettlementStatus());

        verify(transactionRepository, never()).save(any());
        verify(eventPublisher, never()).publish(any());
    }

    @Test
    void testProcessSettlement_NotFound_ThrowsException() {
        MerchantSettlementWebhookRequest request = MerchantSettlementWebhookRequest.builder()
                .referenceId("NON_EXISTENT_REF")
                .merchantId("MERCH_001")
                .settlementAmount(BigDecimal.valueOf(250.00))
                .currency("INR")
                .status("SETTLED")
                .build();

        when(transactionRepository.findByReferenceIdForUpdate("NON_EXISTENT_REF"))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> settlementService.processSettlement(request));
    }

    @Test
    void testProcessSettlement_AmountMismatch_ThrowsException() {
        MerchantSettlementWebhookRequest request = MerchantSettlementWebhookRequest.builder()
                .referenceId("REF_TXN_12345")
                .merchantId("MERCH_001")
                .settlementAmount(BigDecimal.valueOf(999.00)) // Expected 250.00
                .currency("INR")
                .status("SETTLED")
                .build();

        when(transactionRepository.findByReferenceIdForUpdate("REF_TXN_12345"))
                .thenReturn(Optional.of(transaction));

        assertThrows(IllegalArgumentException.class, () -> settlementService.processSettlement(request));
        verify(transactionRepository, never()).save(any());
    }
}
