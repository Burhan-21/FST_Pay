package com.fstpay.wallet.service;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
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
import java.math.RoundingMode;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WalletServiceTest {

    @Mock
    private WalletRepository walletRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private TransactionRepository transactionRepository;

    private WalletService walletService;

    @BeforeEach
    void setUp() {
        walletService = new WalletService(walletRepository, userRepository, transactionRepository);
    }

    @Test
    void getWallet_WithValidEmail_ReturnsWallet() {
        User user = User.builder().id(UUID.randomUUID()).email("test@example.com").build();
        Wallet wallet = Wallet.builder()
                .id(UUID.randomUUID())
                .user(user)
                .balance(new BigDecimal("1000.00"))
                .currency("INR")
                .isActive(true)
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(walletRepository.findByUser(user)).thenReturn(Optional.of(wallet));

        Wallet result = walletService.getWalletByUserEmail("test@example.com");

        assertNotNull(result);
        assertEquals(new BigDecimal("1000.00"), result.getBalance());
        assertEquals("INR", result.getCurrency());
    }

    @Test
    void getWallet_WithNonexistentEmail_ThrowsException() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> walletService.getWalletByUserEmail("nobody@example.com"));
    }

    @Test
    void getWallet_WithNullEmail_ThrowsException() {
        assertThrows(BadRequestException.class,
                () -> walletService.getWalletByUserEmail(null));
    }

    @Test
    void topUp_WithValidAmount_IncreasesBalance() {
        User user = User.builder().id(UUID.randomUUID()).email("test@example.com").build();
        Wallet wallet = Wallet.builder()
                .id(UUID.randomUUID())
                .user(user)
                .balance(new BigDecimal("500.00"))
                .currency("INR")
                .isActive(true)
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(walletRepository.findByUser(user)).thenReturn(Optional.of(wallet));
        when(walletRepository.save(any(Wallet.class))).thenAnswer(i -> i.getArgument(0));

        Wallet result = walletService.topUp("test@example.com", new BigDecimal("250.00"), "UPI");

        assertNotNull(result);
        assertEquals(new BigDecimal("750.00").setScale(2, RoundingMode.HALF_UP), result.getBalance());
    }

    @Test
    void topUp_WithAmountBelowMinimum_ThrowsException() {
        assertThrows(BadRequestException.class,
                () -> walletService.topUp("test@example.com", new BigDecimal("0.50"), "UPI"));
    }

    @Test
    void topUp_WithAmountAboveMaximum_ThrowsException() {
        assertThrows(BadRequestException.class,
                () -> walletService.topUp("test@example.com", new BigDecimal("100001.00"), "UPI"));
    }

    @Test
    void topUp_WithNullAmount_ThrowsException() {
        assertThrows(BadRequestException.class,
                () -> walletService.topUp("test@example.com", null, "UPI"));
    }

    @Test
    void topUp_WithOverflowAmount_ThrowsException() {
        User user = User.builder().id(UUID.randomUUID()).email("test@example.com").build();
        Wallet wallet = Wallet.builder()
                .id(UUID.randomUUID())
                .user(user)
                .balance(new BigDecimal("999999900.00"))
                .currency("INR")
                .isActive(true)
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(walletRepository.findByUser(user)).thenReturn(Optional.of(wallet));

        assertThrows(BadRequestException.class,
                () -> walletService.topUp("test@example.com", new BigDecimal("100.00"), "UPI"));
    }

    @Test
    void topUp_WithBigDecimalPrecision_RoundsCorrectly() {
        User user = User.builder().id(UUID.randomUUID()).email("test@example.com").build();
        Wallet wallet = Wallet.builder()
                .id(UUID.randomUUID())
                .user(user)
                .balance(new BigDecimal("0.00"))
                .currency("INR")
                .isActive(true)
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(walletRepository.findByUser(user)).thenReturn(Optional.of(wallet));
        when(walletRepository.save(any(Wallet.class))).thenAnswer(i -> i.getArgument(0));

        Wallet result = walletService.topUp("test@example.com", new BigDecimal("100.45678"), "UPI");

        assertEquals(new BigDecimal("100.46").setScale(2, RoundingMode.HALF_UP), result.getBalance());
    }
}
