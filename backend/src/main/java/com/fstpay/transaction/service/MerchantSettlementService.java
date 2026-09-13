package com.fstpay.transaction.service;

import com.fstpay.common.event.EventPublisher;
import com.fstpay.common.event.MerchantSettlementEvent;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.notification.enums.NotificationType;
import com.fstpay.notification.service.NotificationService;
import com.fstpay.transaction.dto.MerchantSettlementResponse;
import com.fstpay.transaction.dto.MerchantSettlementWebhookRequest;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MerchantSettlementService {

    private final TransactionRepository transactionRepository;
    private final EventPublisher eventPublisher;
    private final NotificationService notificationService;

    @Transactional
    public MerchantSettlementResponse processSettlement(MerchantSettlementWebhookRequest request) {
        log.info("Processing merchant settlement webhook for referenceId: {}, merchantId: {}, status: {}",
                request.getReferenceId(), request.getMerchantId(), request.getStatus());

        // 1. Pessimistic lock lookup by referenceId (or transactionId fallback)
        Optional<Transaction> txnOpt = transactionRepository.findByReferenceIdForUpdate(request.getReferenceId());
        if (txnOpt.isEmpty() && request.getTransactionId() != null) {
            txnOpt = transactionRepository.findByIdForUpdate(request.getTransactionId());
        }

        if (txnOpt.isEmpty()) {
            log.error("Transaction not found for settlement reference: {}", request.getReferenceId());
            throw new ResourceNotFoundException("Transaction not found for reference: " + request.getReferenceId());
        }

        Transaction transaction = txnOpt.get();

        // 2. Idempotency Guard: If already settled, do not re-process
        if ("SETTLED".equalsIgnoreCase(transaction.getStatus())) {
            log.info("Transaction {} is already settled. Ignoring duplicate webhook callback.", transaction.getId());
            return MerchantSettlementResponse.builder()
                    .status("IGNORED_DUPLICATE")
                    .transactionId(transaction.getId())
                    .referenceId(transaction.getReferenceId())
                    .settlementStatus("SETTLED")
                    .message("Transaction has already been settled")
                    .processedAt(Instant.now())
                    .build();
        }

        // 3. Amount consistency validation
        if (request.getSettlementAmount().compareTo(transaction.getAmount()) != 0) {
            log.error("Settlement amount mismatch for transaction {}: expected {}, received {}",
                    transaction.getId(), transaction.getAmount(), request.getSettlementAmount());
            throw new IllegalArgumentException(String.format(
                    "Settlement amount mismatch: expected %s, but received %s",
                    transaction.getAmount(), request.getSettlementAmount()
            ));
        }

        // 4. Update transaction status
        String finalStatus = request.getStatus().toUpperCase();
        transaction.setStatus(finalStatus);
        transactionRepository.save(transaction);
        log.info("Updated transaction {} status to {}", transaction.getId(), finalStatus);

        // 5. Publish Domain Event via Transactional Outbox
        UUID walletId = transaction.getWallet() != null ? transaction.getWallet().getId() : null;
        User user = (transaction.getWallet() != null) ? transaction.getWallet().getUser() : null;
        UUID userId = (user != null) ? user.getId() : null;

        eventPublisher.publish(MerchantSettlementEvent.create(
                transaction.getId(),
                transaction.getReferenceId(),
                request.getMerchantId(),
                request.getSettlementAmount(),
                finalStatus,
                walletId,
                userId
        ));

        // 6. Notify user of settlement confirmation
        if (user != null) {
            String title = "SETTLED".equalsIgnoreCase(finalStatus)
                    ? "Payment Settled"
                    : "Payment Settlement " + finalStatus;
            String message = String.format(
                    "Your payment of ₹%s at %s has been %s (Ref: %s).",
                    request.getSettlementAmount().toPlainString(),
                    transaction.getMerchant() != null ? transaction.getMerchant() : request.getMerchantId(),
                    finalStatus.toLowerCase(),
                    transaction.getReferenceId()
            );

            try {
                notificationService.sendNotification(user, null, NotificationType.SYSTEM, title, message);
            } catch (Exception e) {
                log.warn("Failed to dispatch in-app settlement notification to user {}: {}", user.getId(), e.getMessage());
            }
        }

        return MerchantSettlementResponse.builder()
                .status("SUCCESS")
                .transactionId(transaction.getId())
                .referenceId(transaction.getReferenceId())
                .settlementStatus(finalStatus)
                .message("Settlement processed successfully")
                .processedAt(Instant.now())
                .build();
    }
}
