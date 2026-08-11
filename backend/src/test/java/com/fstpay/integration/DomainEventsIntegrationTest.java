package com.fstpay.integration;

import com.fstpay.audit.entity.AuditLog;
import com.fstpay.audit.repository.AuditLogRepository;
import com.fstpay.common.event.EventPublisher;
import com.fstpay.common.event.MoneyTransferredEvent;
import com.fstpay.notification.entity.Notification;
import com.fstpay.notification.repository.NotificationRepository;
import com.fstpay.reward.entity.RewardPoints;
import com.fstpay.reward.repository.RewardPointsRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.application.WalletService;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class DomainEventsIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private WalletService walletService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private RewardPointsRepository rewardPointsRepository;

    @Autowired
    private MeterRegistry meterRegistry;

    @Autowired
    private com.fstpay.common.outbox.OutboxPublisher outboxPublisher;

    @Test
    void moneyTransferredEvent_shouldTriggerListenersCorrectly() throws InterruptedException {
        // 1. Setup parent and teenager users
        User parent = User.builder()
                .email("parent-" + UUID.randomUUID() + "@test.com")
                .fullName("Parent User")
                .passwordHash("Password123")
                .role("PARENT")
                .dateOfBirth(LocalDate.of(1980, 1, 1))
                .build();
        parent = userRepository.save(parent);

        User teen = User.builder()
                .email("teen-" + UUID.randomUUID() + "@test.com")
                .fullName("Teen User")
                .passwordHash("Password123")
                .role("TEEN")
                .dateOfBirth(LocalDate.of(2010, 1, 1))
                .build();
        teen = userRepository.save(teen);

        // 2. Setup wallets
        Wallet parentWallet = Wallet.builder()
                .user(parent)
                .balance(new BigDecimal("1000.00"))
                .currency("INR")
                .isActive(true)
                .build();
        walletRepository.save(parentWallet);

        Wallet teenWallet = Wallet.builder()
                .user(teen)
                .balance(new BigDecimal("100.00"))
                .currency("INR")
                .isActive(true)
                .build();
        walletRepository.save(teenWallet);

        // Setup reward points for teen
        RewardPoints points = RewardPoints.builder()
                .user(teen)
                .points(100)
                .xp(50)
                .level(1)
                .streakDays(0)
                .build();
        rewardPointsRepository.save(points);

        double initialTransfersCount = 0;
        try {
            initialTransfersCount = meterRegistry.counter("fstpay.wallet.transfers.total").count();
        } catch (Exception ignored) {}

        // 3. Perform transfer via WalletService (which internally publishes MoneyTransferredEvent)
        walletService.transfer(parent, teen, new BigDecimal("200.00"), "POCKET_MONEY", "Weekly allowance", "Parent Transfer");

        // Trigger outbox publisher to dispatch the event
        outboxPublisher.publishPendingEvents();

        // 4. Wait for async event listeners to complete execution
        Thread.sleep(1000);

        // 5. Verify notifications were sent
        List<Notification> parentNotifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(parent.getId());
        List<Notification> teenNotifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(teen.getId());

        assertFalse(parentNotifications.isEmpty(), "Parent should receive notification");
        assertFalse(teenNotifications.isEmpty(), "Teen should receive notification");
        assertTrue(parentNotifications.get(0).getMessage().contains("₹200.00"));
        assertTrue(teenNotifications.get(0).getMessage().contains("₹200.00"));

        // 6. Verify audit logs
        List<AuditLog> parentAudits = auditLogRepository.findByUserIdOrderByCreatedAtDesc(parent.getId());
        List<AuditLog> teenAudits = auditLogRepository.findByUserIdOrderByCreatedAtDesc(teen.getId());

        assertFalse(parentAudits.isEmpty(), "Parent audit log should be present");
        assertFalse(teenAudits.isEmpty(), "Teen audit log should be present");
        assertEquals("POCKET_MONEY_SENT", parentAudits.get(0).getAction());
        assertEquals("POCKET_MONEY_RECEIVED", teenAudits.get(0).getAction());

        // 7. Verify Micrometer counter increment
        double finalTransfersCount = meterRegistry.counter("fstpay.wallet.transfers.total").count();
        assertEquals(initialTransfersCount + 1, finalTransfersCount, 0.01, "Micrometer transfers counter should be incremented");

        // 8. Verify teen received XP points reward (+5 XP)
        RewardPoints updatedPoints = rewardPointsRepository.findByUser(teen).orElseThrow();
        assertEquals(55, updatedPoints.getXp(), "Teenager XP should be incremented by 5");
    }
}
