package com.fstpay.notification.service;

import com.fstpay.common.event.MerchantSettlementEvent;
import com.fstpay.common.event.WalletFundedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Slf4j
public class SseNotificationService {

    // 30 minutes connection timeout
    private static final long SSE_TIMEOUT_MS = 30 * 60 * 1000L;

    private final com.fstpay.user.repository.UserRepository userRepository;
    private final Map<UUID, List<SseEmitter>> userEmitters = new ConcurrentHashMap<>();

    public SseNotificationService(com.fstpay.user.repository.UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Subscribes a user by email to the real-time event stream.
     */
    public SseEmitter subscribe(String email) {
        com.fstpay.user.entity.User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new com.fstpay.common.exception.ResourceNotFoundException("User not found: " + email));
        return subscribe(user.getId());
    }

    /**
     * Registers a new SSE client connection for the authenticated user ID.
     */
    public SseEmitter subscribe(UUID userId) {
        log.info("Client subscribing to real-time SSE stream for userId: {}", userId);
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);

        userEmitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(userId, emitter));
        emitter.onTimeout(() -> {
            log.debug("SSE connection timed out for userId: {}", userId);
            emitter.complete();
            removeEmitter(userId, emitter);
        });
        emitter.onError(e -> {
            log.debug("SSE connection error for userId {}: {}", userId, e.getMessage());
            removeEmitter(userId, emitter);
        });

        // Send initial handshake ping
        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .id(UUID.randomUUID().toString())
                    .data(Map.of(
                            "message", "Connected to FST Pay real-time live feed",
                            "connectedAt", Instant.now().toString()
                    )));
        } catch (IOException e) {
            log.warn("Failed to send initial SSE handshake to userId {}: {}", userId, e.getMessage());
            removeEmitter(userId, emitter);
        }

        return emitter;
    }

    /**
     * Dispatches an event to all active emitters registered for a specific user.
     */
    public void sendToUser(UUID userId, String eventName, Object payload) {
        if (userId == null) {
            return;
        }

        List<SseEmitter> emitters = userEmitters.get(userId);
        if (emitters == null || emitters.isEmpty()) {
            log.debug("No active SSE listeners for userId: {}", userId);
            return;
        }

        log.debug("Dispatching SSE event '{}' to {} active listeners for userId: {}", eventName, emitters.size(), userId);
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .id(UUID.randomUUID().toString())
                        .data(payload));
            } catch (Exception e) {
                log.warn("Failed to send SSE event to listener for userId {}. Removing dead emitter.", userId);
                removeEmitter(userId, emitter);
            }
        }
    }

    /**
     * Broadcasts an event to all connected users.
     */
    public void broadcast(String eventName, Object payload) {
        log.info("Broadcasting SSE event '{}' across all connected clients", eventName);
        userEmitters.forEach((userId, emitters) -> {
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event()
                            .name(eventName)
                            .id(UUID.randomUUID().toString())
                            .data(payload));
                } catch (Exception e) {
                    removeEmitter(userId, emitter);
                }
            }
        });
    }

    private void removeEmitter(UUID userId, SseEmitter emitter) {
        List<SseEmitter> emitters = userEmitters.get(userId);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) {
                userEmitters.remove(userId);
            }
        }
    }

    // ==========================================
    // Domain Event Listeners for Live UI Updates
    // ==========================================

    @EventListener
    public void handleMerchantSettlement(MerchantSettlementEvent event) {
        log.info("SSE received MerchantSettlementEvent for transaction: {}", event.transactionId());
        if (event.userId() != null) {
            sendToUser(event.userId(), "SETTLEMENT_UPDATE", Map.of(
                    "transactionId", event.transactionId() != null ? event.transactionId().toString() : "",
                    "referenceId", event.referenceId(),
                    "merchantId", event.merchantId(),
                    "status", event.status(),
                    "amount", event.settlementAmount(),
                    "timestamp", Instant.now().toString()
            ));
        }
    }

    @EventListener
    public void handleWalletFunded(WalletFundedEvent event) {
        log.info("SSE received WalletFundedEvent for user: {}", event.user().id());
        if (event.user() != null && event.user().id() != null) {
            sendToUser(event.user().id(), "WALLET_UPDATE", Map.of(
                    "amount", event.amount(),
                    "method", event.method(),
                    "referenceId", event.referenceId(),
                    "timestamp", Instant.now().toString()
            ));
        }
    }

    public int getActiveConnectionsCount() {
        return userEmitters.values().stream().mapToInt(List::size).sum();
    }
}
