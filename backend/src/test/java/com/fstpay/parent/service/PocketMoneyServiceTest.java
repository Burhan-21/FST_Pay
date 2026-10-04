package com.fstpay.parent.service;

import com.fstpay.parent.dto.PocketMoneyRequest;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.api.WalletOperations;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PocketMoneyServiceTest {

    @Mock
    private ParentLinkService parentLinkService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private WalletOperations walletService;

    private PocketMoneyService pocketMoneyService;

    private User parent;
    private User child;
    private UUID childId;

    @BeforeEach
    void setUp() {
        pocketMoneyService = new PocketMoneyService(parentLinkService, userRepository, walletService);

        childId = UUID.randomUUID();
        parent = User.builder()
                .id(UUID.randomUUID())
                .email("parent@example.com")
                .fullName("Parent User")
                .build();

        child = User.builder()
                .id(childId)
                .email("teen@example.com")
                .fullName("Teen User")
                .build();

        when(parentLinkService.getAuthorizedChild("parent@example.com", childId)).thenReturn(child);
        when(userRepository.findByEmail("parent@example.com")).thenReturn(Optional.of(parent));
    }

    @Test
    void sendPocketMoney_WithWalletPayment_DirectTransferWithoutTopUp() {
        PocketMoneyRequest request = new PocketMoneyRequest();
        request.setChildId(childId);
        request.setAmount(new BigDecimal("250.00"));
        request.setNote("Weekly allowance");
        request.setPaymentMethod("WALLET");

        pocketMoneyService.sendPocketMoney("parent@example.com", request);

        verify(walletService, never()).topUp(anyString(), any(), anyString());
        verify(walletService, times(1)).transfer(
                eq(parent), eq(child), eq(new BigDecimal("250.00").setScale(2, RoundingMode.HALF_UP)),
                eq("TRANSFER"), eq("Pocket money: Weekly allowance"), eq("FST Pay Family")
        );
    }

    @Test
    void sendPocketMoney_WithUpiPayment_FundsWalletFirstThenTransfers() {
        PocketMoneyRequest request = new PocketMoneyRequest();
        request.setChildId(childId);
        request.setAmount(new BigDecimal("500.00"));
        request.setNote("For books");
        request.setPaymentMethod("UPI");

        pocketMoneyService.sendPocketMoney("parent@example.com", request);

        verify(walletService, times(1)).topUp("parent@example.com", new BigDecimal("500.00").setScale(2, RoundingMode.HALF_UP), "UPI");
        verify(walletService, times(1)).transfer(
                eq(parent), eq(child), eq(new BigDecimal("500.00").setScale(2, RoundingMode.HALF_UP)),
                eq("TRANSFER"), eq("Pocket money: For books"), eq("FST Pay Family")
        );
    }

    @Test
    void sendPocketMoney_WithCardPayment_FundsWalletFirstThenTransfers() {
        PocketMoneyRequest request = new PocketMoneyRequest();
        request.setChildId(childId);
        request.setAmount(new BigDecimal("1000.00"));
        request.setPaymentMethod("CARD");

        pocketMoneyService.sendPocketMoney("parent@example.com", request);

        verify(walletService, times(1)).topUp("parent@example.com", new BigDecimal("1000.00").setScale(2, RoundingMode.HALF_UP), "CARD");
        verify(walletService, times(1)).transfer(
                eq(parent), eq(child), eq(new BigDecimal("1000.00").setScale(2, RoundingMode.HALF_UP)),
                eq("TRANSFER"), eq("Pocket money: Family transfer"), eq("FST Pay Family")
        );
    }
}
