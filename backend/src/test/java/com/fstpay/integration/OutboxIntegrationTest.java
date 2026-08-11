package com.fstpay.integration;

import com.fstpay.common.event.DomainEvent;
import com.fstpay.common.event.EventMetadata;
import com.fstpay.common.event.EventPublisher;
import com.fstpay.common.outbox.OutboxEvent;
import com.fstpay.common.outbox.OutboxEventRepository;
import com.fstpay.common.outbox.OutboxPublisher;
import com.fstpay.common.outbox.OutboxStatus;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.application.WalletService;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@Import(OutboxIntegrationTest.TestListenerConfig.class)
class OutboxIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private WalletService walletService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    @Autowired
    private OutboxPublisher outboxPublisher;

    @Autowired
    private EventPublisher eventPublisher;

    @Test
    void outboxEvent_shouldBePersistedAndProcessedSuccessfully() throws InterruptedException {
        // 1. Setup users and wallets
        User parent = User.builder()
                .email("parent-outbox-" + UUID.randomUUID() + "@test.com")
                .fullName("Parent Outbox")
                .passwordHash("Password123")
                .role("PARENT")
                .dateOfBirth(LocalDate.of(1980, 1, 1))
                .build();
        parent = userRepository.save(parent);

        User teen = User.builder()
                .email("teen-outbox-" + UUID.randomUUID() + "@test.com")
                .fullName("Teen Outbox")
                .passwordHash("Password123")
                .role("TEEN")
                .dateOfBirth(LocalDate.of(2010, 1, 1))
                .build();
        teen = userRepository.save(teen);

        Wallet parentWallet = Wallet.builder()
                .user(parent)
                .balance(new BigDecimal("500.00"))
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

        // 2. Perform transfer (which publishes MoneyTransferredEvent and saves to outbox)
        String refId = walletService.transfer(parent, teen, new BigDecimal("100.00"), "POCKET_MONEY", "Allowance", "Parent");

        // 3. Verify event is in outbox with status PENDING
        List<OutboxEvent> outboxList = outboxEventRepository.findAll();
        OutboxEvent targetEvent = outboxList.stream()
                .filter(e -> e.getPayload().contains(refId))
                .findFirst()
                .orElse(null);

        assertNotNull(targetEvent, "Outbox event must be persisted");
        assertEquals(OutboxStatus.PENDING, targetEvent.getStatus(), "Initial status should be PENDING");
        assertEquals("Wallet", targetEvent.getAggregateType());
        assertNotNull(targetEvent.getCorrelationId());
        assertEquals(1, targetEvent.getEventVersion());

        // 4. Manually trigger the publisher to process pending events
        outboxPublisher.publishPendingEvents();

        // 5. Verify status updated to SENT
        OutboxEvent processedEvent = outboxEventRepository.findById(targetEvent.getId()).orElseThrow();
        assertEquals(OutboxStatus.SENT, processedEvent.getStatus(), "Status should transition to SENT");
        assertNotNull(processedEvent.getPublishedAt());
        assertNull(processedEvent.getLastError());
    }

    @Test
    void outboxEvent_shouldRetryOnFailureAndTransitionToDeadLetter() {
        // 1. Publish dummy test event designed to fail
        TestFailedEvent event = new TestFailedEvent(EventMetadata.create(TestFailedEvent.class.getName()));
        eventPublisher.publish(event);

        // 2. Retrieve from database
        OutboxEvent outboxEvent = outboxEventRepository.findById(event.metadata().eventId()).orElseThrow();
        assertEquals(OutboxStatus.PENDING, outboxEvent.getStatus());

        // 3. Trigger publisher to run and fail
        for (int i = 1; i <= 5; i++) {
            outboxPublisher.publishPendingEvents();
            OutboxEvent currentEvent = outboxEventRepository.findById(event.metadata().eventId()).orElseThrow();
            if (i < 5) {
                assertEquals(OutboxStatus.FAILED, currentEvent.getStatus(), "Should be FAILED on attempt " + i);
                assertEquals(i, currentEvent.getRetryCount(), "Retry count should be " + i);
                assertTrue(currentEvent.getLastError().contains("Simulated listener failure"));
            } else {
                assertEquals(OutboxStatus.DEAD_LETTER, currentEvent.getStatus(), "Should transition to DEAD_LETTER after max retries");
                assertEquals(5, currentEvent.getRetryCount());
            }
        }
    }

    public record TestFailedEvent(EventMetadata metadata) implements DomainEvent {}

    @TestConfiguration
    static class TestListenerConfig {
        @EventListener
        public void handleTestFailedEvent(TestFailedEvent event) {
            throw new RuntimeException("Simulated listener failure");
        }
    }
}
