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
                dailySummaryService
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

        SimulateSpendRequest request = new SimulateSpendRequest();
        request.setAmount(new BigDecimal("500.00"));
        request.setCategory("FOOD");
        request.setMerchant("Swiggy");

        Transaction result = transactionService.simulateSpend("teen@example.com", request);

        assertNotNull(result);
        assertEquals("DEBIT", result.getType());
        assertEquals(new BigDecimal("4500.00"), testWallet.getBalance());
        assertEquals("FOOD", result.getCategory());
        
        // Verify summary service is invoked
        verify(dailySummaryService, times(1)).trackSpend(any(Wallet.class), eq(new BigDecimal("500.00")));
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
}
