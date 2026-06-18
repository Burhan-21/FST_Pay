package com.fstpay.transaction.service;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.transaction.dto.SimulateSpendRequest;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
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

    private TransactionService transactionService;

    private User testUser;
    private Wallet testWallet;

    @BeforeEach
    void setUp() {
        transactionService = new TransactionService(transactionRepository, walletRepository, userRepository);

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

        SimulateSpendRequest request = new SimulateSpendRequest();
        request.setAmount(new BigDecimal("500.00"));
        request.setCategory("FOOD");
        request.setMerchant("Swiggy");

        Transaction result = transactionService.simulateSpend("teen@example.com", request);

        assertNotNull(result);
        assertEquals("DEBIT", result.getType());
        assertEquals(new BigDecimal("4500.00"), testWallet.getBalance());
        assertEquals("FOOD", result.getCategory());
    }

    @Test
    void simulateSpend_WithInsufficientBalance_ThrowsException() {
        testWallet.setBalance(new BigDecimal("100.00"));

        when(userRepository.findByEmail("teen@example.com")).thenReturn(Optional.of(testUser));
        when(walletRepository.findByUser(testUser)).thenReturn(Optional.of(testWallet));

        SimulateSpendRequest request = new SimulateSpendRequest();
        request.setAmount(new BigDecimal("500.00"));
        request.setCategory("FOOD");
        request.setMerchant("Swiggy");

        assertThrows(BadRequestException.class,
                () -> transactionService.simulateSpend("teen@example.com", request));
    }

    @Test
    void simulateSpend_WithInactiveWallet_ThrowsException() {
        testWallet.setIsActive(false);

        when(userRepository.findByEmail("teen@example.com")).thenReturn(Optional.of(testUser));
        when(walletRepository.findByUser(testUser)).thenReturn(Optional.of(testWallet));

        SimulateSpendRequest request = new SimulateSpendRequest();
        request.setAmount(new BigDecimal("100.00"));
        request.setCategory("FOOD");

        assertThrows(BadRequestException.class,
                () -> transactionService.simulateSpend("teen@example.com", request));
    }

    @Test
    void simulateSpend_WithParentalMaxAmount_ExceedsLimit_ThrowsException() {
        testUser.setParentalControlEnabled(true);
        testUser.setParentalMaxTxnAmount(new BigDecimal("200.00"));

        when(userRepository.findByEmail("teen@example.com")).thenReturn(Optional.of(testUser));
        when(walletRepository.findByUser(testUser)).thenReturn(Optional.of(testWallet));

        SimulateSpendRequest request = new SimulateSpendRequest();
        request.setAmount(new BigDecimal("500.00"));
        request.setCategory("FOOD");
        request.setMerchant("Swiggy");

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> transactionService.simulateSpend("teen@example.com", request));
        assertTrue(ex.getMessage().contains("parental control"));
    }

    @Test
    void simulateSpend_WithParentalRestrictedCategory_ThrowsException() {
        testUser.setParentalControlEnabled(true);
        testUser.setParentalMaxTxnAmount(new BigDecimal("5000.00"));
        testUser.setParentalRestrictedCategories("GAMING,ENTERTAINMENT");

        when(userRepository.findByEmail("teen@example.com")).thenReturn(Optional.of(testUser));
        when(walletRepository.findByUser(testUser)).thenReturn(Optional.of(testWallet));

        SimulateSpendRequest request = new SimulateSpendRequest();
        request.setAmount(new BigDecimal("100.00"));
        request.setCategory("GAMING");
        request.setMerchant("Steam");

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> transactionService.simulateSpend("teen@example.com", request));
        assertTrue(ex.getMessage().contains("parental control"));
    }

    @Test
    void simulateSpend_WithParentalControls_AllowedCategory_Succeeds() {
        testUser.setParentalControlEnabled(true);
        testUser.setParentalMaxTxnAmount(new BigDecimal("5000.00"));
        testUser.setParentalRestrictedCategories("GAMING,ENTERTAINMENT");

        when(userRepository.findByEmail("teen@example.com")).thenReturn(Optional.of(testUser));
        when(walletRepository.findByUser(testUser)).thenReturn(Optional.of(testWallet));
        when(walletRepository.save(any(Wallet.class))).thenAnswer(i -> i.getArgument(0));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArgument(0));

        SimulateSpendRequest request = new SimulateSpendRequest();
        request.setAmount(new BigDecimal("300.00"));
        request.setCategory("FOOD");
        request.setMerchant("Zomato");

        Transaction result = transactionService.simulateSpend("teen@example.com", request);

        assertNotNull(result);
        assertEquals("FOOD", result.getCategory());
        assertEquals(new BigDecimal("4700.00"), testWallet.getBalance());
    }
}
