package com.fstpay.transaction.controller;

import com.fstpay.common.dto.ApiResponse;
import com.fstpay.transaction.dto.MerchantSettlementResponse;
import com.fstpay.transaction.dto.MerchantSettlementWebhookRequest;
import com.fstpay.transaction.service.MerchantSettlementService;
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

    @PostMapping("/merchant-settlement")
    @Operation(
            summary = "Process merchant settlement callback",
            description = "Receives asynchronous settlement confirmation from payment processors. Enforces HMAC-SHA256 signature verification."
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
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid or missing X-Webhook-Signature header"));
        }

        MerchantSettlementResponse response = settlementService.processSettlement(request);
        return ResponseEntity.ok(ApiResponse.success(response.getMessage(), response));
    }
}
