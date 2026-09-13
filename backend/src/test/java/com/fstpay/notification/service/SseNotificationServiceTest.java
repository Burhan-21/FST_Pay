package com.fstpay.notification.service;

import com.fstpay.common.event.MerchantSettlementEvent;
import com.fstpay.common.event.UserSnapshot;
import com.fstpay.common.event.WalletFundedEvent;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SseNotificationServiceTest {

    @Mock
    private UserRepository userRepository;

    private SseNotificationService sseNotificationService;
    private User testUser;
    private UUID userId;

    @BeforeEach
    void setUp() {
        sseNotificationService = new SseNotificationService(userRepository);
        userId = UUID.randomUUID();
        testUser = User.builder()
                .id(userId)
                .email("test@example.com")
                .fullName("SSE Tester")
                .build();
    }

    @Test
    void testSubscribeByUserId_ReturnsEmitter() {
        SseEmitter emitter = sseNotificationService.subscribe(userId);
        assertNotNull(emitter);
        assertEquals(1, sseNotificationService.getActiveConnectionsCount());
    }

    @Test
    void testSubscribeByEmail_FindsUserAndSubscribes() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));

        SseEmitter emitter = sseNotificationService.subscribe("test@example.com");
        assertNotNull(emitter);
        assertEquals(1, sseNotificationService.getActiveConnectionsCount());
    }

    @Test
    void testHandleMerchantSettlement_DispatchesEventWithoutError() {
        sseNotificationService.subscribe(userId);

        MerchantSettlementEvent event = MerchantSettlementEvent.create(
                UUID.randomUUID(),
                "REF_123",
                "MERCH_999",
                BigDecimal.valueOf(150.00),
                "SETTLED",
                UUID.randomUUID(),
                userId
        );

        assertDoesNotThrow(() -> sseNotificationService.handleMerchantSettlement(event));
    }

    @Test
    void testHandleWalletFunded_DispatchesEventWithoutError() {
        sseNotificationService.subscribe(userId);

        WalletFundedEvent event = WalletFundedEvent.create(
                testUser,
                BigDecimal.valueOf(500.00),
                "UPI",
                "TOPUP_REF_123"
        );

        assertDoesNotThrow(() -> sseNotificationService.handleWalletFunded(event));
    }
}
