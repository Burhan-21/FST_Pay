package com.fstpay.transaction.service;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.rule.TransactionRuleEngine;
import com.fstpay.common.rule.RuleEvaluationResult;
import com.fstpay.common.rule.RuleStatus;
import com.fstpay.transaction.dto.SimulateSpendRequest;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import com.fstpay.wallet.api.WalletDailySummaryOperations;
import com.fstpay.parent.entity.TransactionApproval;
import com.fstpay.parent.policy.ParentalControlPolicy;
import com.fstpay.parent.policy.ParentalPolicyResult;
import com.fstpay.transaction.dto.SpendSimulationResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private WalletRepository walletRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private TransactionExportService transactionExportService;
    @Mock
    private TransactionRuleEngine ruleEngine;
    @Mock
    private WalletDailySummaryOperations dailySummaryService;
    @Mock
    private ParentalControlPolicy parentalControlPolicy;
    @Mock
    private com.fstpay.fx.service.FxRateService fxRateService;

    private TransactionService transactionService;

    private User testUser;
    private Wallet testWallet;

    @BeforeEach
    void setUp() {
        transactionService = new TransactionService(
                transactionRepository,
                walletRepository,
                userRepository,
                transactionExportService,
                ruleEngine,
                dailySummaryService,
                parentalControlPolicy,
                fxRateService
        );

        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("teen@example.com")
                .fullName("Test Teen")
                .dateOfBirth(LocalDate.of(2008, 6, 15))
                .role("USER")
                .isActive(true)
                .build();

        testWallet = Wallet.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .balance(new BigDecimal("5000.00"))
                .currency("INR")
                .isActive(true)
                .build();
    }

    @Test
    void simulateSpend_WithSufficientBalance_DeductsCorrectly() {
        when(userRepository.findByEmail("teen@example.com")).thenReturn(Optional.of(testUser));
        when(walletRepository.findByUser(testUser)).thenReturn(Optional.of(testWallet));
        when(walletRepository.save(any(Wallet.class))).thenAnswer(i -> i.getArgument(0));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArgument(0));

        // Mock rule engine to return success
        when(ruleEngine.process(any(), any(), any())).thenReturn(
                RuleEvaluationResult.builder()
                        .status(RuleStatus.APPROVED)
                        .message("All checks passed")
                        .build()
        );

        // Mock policy to allow
        when(parentalControlPolicy.evaluate(any(), any(), any(), any(), any(), any()))
                .thenReturn(ParentalPolicyResult.allowed("All checks passed"));

        SimulateSpendRequest request = new SimulateSpendRequest();
        request.setAmount(new BigDecimal("500.00"));
        request.setCategory("FOOD");
        request.setMerchant("Swiggy");

        SpendSimulationResult result = transactionService.simulateSpend("teen@example.com", request);

        assertNotNull(result);
        assertTrue(result.isCompleted());
        assertNotNull(result.getTransaction());
        assertEquals("DEBIT", result.getTransaction().getType());
        assertEquals(new BigDecimal("4500.00"), testWallet.getBalance());
        assertEquals("FOOD", result.getTransaction().getCategory());
        
        // Verify summary service is invoked
        verify(dailySummaryService, times(1)).trackSpend(any(Wallet.class), eq(new BigDecimal("500.00")));
    }

    @Test
    void simulateSpend_WhenParentalControlRequiresApproval_ReturnsPendingApprovalWithoutDebit() {
        when(userRepository.findByEmail("teen@example.com")).thenReturn(Optional.of(testUser));
        when(walletRepository.findByUser(testUser)).thenReturn(Optional.of(testWallet));

        when(ruleEngine.process(any(), any(), any())).thenReturn(
                RuleEvaluationResult.builder()
                        .status(RuleStatus.APPROVED)
                        .message("All checks passed")
                        .build()
        );

        TransactionApproval approval = TransactionApproval.builder()
                .id(UUID.randomUUID())
                .child(testUser)
                .requestType("SPEND")
                .amount(new BigDecimal("2500.00"))
                .status("PENDING")
                .build();

        when(parentalControlPolicy.evaluate(any(), any(), any(), any(), any(), any()))
                .thenReturn(ParentalPolicyResult.requiresApproval(approval, "Exceeds max transaction limit"));

        SimulateSpendRequest request = new SimulateSpendRequest();
        request.setAmount(new BigDecimal("2500.00"));
        request.setCategory("ELECTRONICS");
        request.setMerchant("Amazon");

        SpendSimulationResult result = transactionService.simulateSpend("teen@example.com", request);

        assertNotNull(result);
        assertTrue(result.isRequiresApproval());
        assertFalse(result.isCompleted());
        assertNotNull(result.getApproval());
        assertEquals("PENDING", result.getApproval().getStatus());
        // Balance remains unchanged
        assertEquals(new BigDecimal("5000.00"), testWallet.getBalance());
        verify(walletRepository, never()).save(any());
        verify(transactionRepository, never()).save(any());
        verify(dailySummaryService, never()).trackSpend(any(), any());
    }

    @Test
    void simulateSpend_WithRuleEngineException_ThrowsException() {
        when(userRepository.findByEmail("teen@example.com")).thenReturn(Optional.of(testUser));
        when(walletRepository.findByUser(testUser)).thenReturn(Optional.of(testWallet));

        // Mock rule engine to throw validation exception
        when(ruleEngine.process(any(), any(), any()))
                .thenThrow(new BadRequestException("Insufficient balance or limit exceeded"));

        SimulateSpendRequest request = new SimulateSpendRequest();
        request.setAmount(new BigDecimal("500.00"));
        request.setCategory("FOOD");
        request.setMerchant("Swiggy");

        assertThrows(BadRequestException.class,
                () -> transactionService.simulateSpend("teen@example.com", request));
    }

    @Test
    void simulateSpend_ForeignCurrency_ConvertsAndRecordsFxMetadata() {
        when(userRepository.findByEmail("teen@example.com")).thenReturn(Optional.of(testUser));
        when(walletRepository.findByUser(testUser)).thenReturn(Optional.of(testWallet));
        when(walletRepository.save(any(Wallet.class))).thenAnswer(i -> i.getArgument(0));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArgument(0));

        when(ruleEngine.process(any(), any(), any())).thenReturn(
                RuleEvaluationResult.builder().status(RuleStatus.APPROVED).message("All checks passed").build()
        );

        when(parentalControlPolicy.evaluate(any(), any(), any(), any(), any(), any()))
                .thenReturn(ParentalPolicyResult.allowed("All checks passed"));

        // Spend $10.00 USD from INR wallet
        com.fstpay.fx.dto.FxConversionQuote mockQuote = com.fstpay.fx.dto.FxConversionQuote.builder()
                .sourceAmount(new BigDecimal("10.00"))
                .sourceCurrency("USD")
                .targetCurrency("INR")
                .exchangeRate(new BigDecimal("86.5000"))
                .convertedAmount(new BigDecimal("865.00"))
                .feePercentage(new BigDecimal("1.50"))
                .feeAmount(new BigDecimal("12.98"))
                .totalAmount(new BigDecimal("877.98"))
                .expiresInSeconds(900)
                .build();

        when(fxRateService.getQuote(new BigDecimal("10.00"), "USD", "INR")).thenReturn(mockQuote);

        SimulateSpendRequest request = new SimulateSpendRequest();
        request.setAmount(new BigDecimal("10.00"));
        request.setCurrency("USD");
        request.setCategory("GAMING");
        request.setMerchant("Steam Store");

        SpendSimulationResult result = transactionService.simulateSpend("teen@example.com", request);

        assertNotNull(result);
        assertTrue(result.isCompleted());
        Transaction txn = result.getTransaction();
        assertNotNull(txn);
        // Total charge in INR: 877.98
        assertEquals(new BigDecimal("877.98"), txn.getAmount());
        assertEquals(new BigDecimal("4122.02"), testWallet.getBalance());
        assertEquals(new BigDecimal("10.00"), txn.getOriginalAmount());
        assertEquals("USD", txn.getOriginalCurrency());
        assertEquals(new BigDecimal("86.5000"), txn.getFxRate());
        assertEquals(new BigDecimal("12.98"), txn.getFxFee());
        assertTrue(txn.getDescription().contains("Converted: USD 10.00 @ 86.5000 + INR 12.98 FX fee"));
    }

    @Test
    void simulateSpend_InsufficientBalanceForForeignSpend_ThrowsBadRequest() {
        when(userRepository.findByEmail("teen@example.com")).thenReturn(Optional.of(testUser));
        when(walletRepository.findByUser(testUser)).thenReturn(Optional.of(testWallet));

        // Attempt to spend $100 USD (which is > ₹5,000 wallet balance)
        com.fstpay.fx.dto.FxConversionQuote highQuote = com.fstpay.fx.dto.FxConversionQuote.builder()
                .sourceAmount(new BigDecimal("100.00"))
                .sourceCurrency("USD")
                .targetCurrency("INR")
                .totalAmount(new BigDecimal("8779.80"))
                .build();

        when(fxRateService.getQuote(new BigDecimal("100.00"), "USD", "INR")).thenReturn(highQuote);

        SimulateSpendRequest request = new SimulateSpendRequest();
        request.setAmount(new BigDecimal("100.00"));
        request.setCurrency("USD");
        request.setCategory("ELECTRONICS");
        request.setMerchant("Apple Store");

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> transactionService.simulateSpend("teen@example.com", request));
        assertTrue(ex.getMessage().contains("Insufficient wallet balance"));
    }
}
