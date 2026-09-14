package com.fstpay.transaction.controller;

import com.fstpay.common.dto.ApiResponse;
import com.fstpay.transaction.dto.MerchantSettlementResponse;
import com.fstpay.transaction.dto.MerchantSettlementWebhookRequest;
import com.fstpay.transaction.service.MerchantSettlementService;
import com.fstpay.transaction.service.WebhookDlqService;
import com.fstpay.transaction.service.WebhookSignatureValidator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/webhooks")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Webhooks", description = "Endpoints for payment gateway callbacks and asynchronous merchant settlements")
public class MerchantSettlementWebhookController {

    private final MerchantSettlementService settlementService;
    private final WebhookSignatureValidator signatureValidator;
    private final WebhookDlqService dlqService;
    @org.springframework.beans.factory.annotation.Qualifier("merchantSettlementCircuitBreaker")
    private final io.github.resilience4j.circuitbreaker.CircuitBreaker circuitBreaker;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private io.micrometer.core.instrument.MeterRegistry meterRegistry = new io.micrometer.core.instrument.simple.SimpleMeterRegistry();

    @PostMapping("/merchant-settlement")
    @Operation(
            summary = "Process merchant settlement callback",
            description = "Receives asynchronous settlement confirmation from payment processors. Enforces HMAC-SHA256 signature verification and Resilience4j circuit breaking with DLQ fallback."
    )
    public ResponseEntity<ApiResponse<MerchantSettlementResponse>> handleMerchantSettlement(
            @RequestHeader(value = "X-Webhook-Signature", required = false) String signature,
            @Valid @RequestBody MerchantSettlementWebhookRequest request
    ) {
        log.info("Received settlement webhook for referenceId: {}", request.getReferenceId());

        // Canonical payload for HMAC verification: "<referenceId>:<amount>:<status>"
        String canonicalPayload = String.format("%s:%s:%s",
                request.getReferenceId(),
                request.getSettlementAmount().toPlainString(),
                request.getStatus().toUpperCase());

        if (signature == null || !signatureValidator.isValidSignature(canonicalPayload, signature)) {
            log.warn("Unauthorized webhook attempt rejected: invalid HMAC signature for reference {}", request.getReferenceId());
            if (meterRegistry != null) {
                try {
                    meterRegistry.counter("fstpay.webhooks.received.total", "status", "invalid_signature").increment();
                } catch (Exception ignored) {}
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid or missing X-Webhook-Signature header"));
        }

        if (meterRegistry != null) {
            try {
                meterRegistry.counter("fstpay.webhooks.received.total", "status", "valid").increment();
            } catch (Exception ignored) {}
        }

        try {
            MerchantSettlementResponse response = circuitBreaker.executeSupplier(() ->
                    settlementService.processSettlement(request)
            );
            return ResponseEntity.ok(ApiResponse.success(response.getMessage(), response));
        } catch (io.github.resilience4j.circuitbreaker.CallNotPermittedException e) {
            log.warn("Circuit breaker OPEN for merchant settlement. Queuing webhook {} into DLQ", request.getReferenceId());
            dlqService.queueFailedWebhook(request, "Circuit breaker is OPEN: " + e.getMessage(), true);
            MerchantSettlementResponse queuedResponse = MerchantSettlementResponse.builder()
                    .status("QUEUED_RETRY")
                    .referenceId(request.getReferenceId())
                    .message("Circuit breaker open: Settlement accepted and queued for resilient processing")
                    .processedAt(java.time.Instant.now())
                    .build();
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(ApiResponse.success("Circuit breaker open: Settlement accepted and queued for resilient retry", queuedResponse));
        } catch (Exception ex) {
            log.error("Settlement processing failed for webhook {}. Queuing into DLQ for retry. Reason: {}",
                    request.getReferenceId(), ex.getMessage());
            dlqService.queueFailedWebhook(request, ex.getMessage(), false);
            MerchantSettlementResponse queuedResponse = MerchantSettlementResponse.builder()
                    .status("QUEUED_RETRY")
                    .referenceId(request.getReferenceId())
                    .message("Settlement accepted and queued for resilient retry: " + ex.getMessage())
                    .processedAt(java.time.Instant.now())
                    .build();
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(ApiResponse.success("Settlement accepted and queued for resilient retry", queuedResponse));
        }
    }
}
