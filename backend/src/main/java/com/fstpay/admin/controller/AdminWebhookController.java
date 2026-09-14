package com.fstpay.admin.controller;

import com.fstpay.common.dto.ApiResponse;
import com.fstpay.transaction.dto.CircuitBreakerStatusDto;
import com.fstpay.transaction.dto.WebhookDlqDto;
import com.fstpay.transaction.service.WebhookDlqService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/webhooks")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Webhooks & DLQ", description = "Endpoints for managing webhook dead-letter queue retries and Resilience4j circuit breaker telemetry")
public class AdminWebhookController {

    private final WebhookDlqService dlqService;

    @GetMapping("/dlq")
    @Operation(summary = "Get paginated webhook DLQ records", description = "Retrieves dead-letter queue records filtered by status.")
    public ResponseEntity<ApiResponse<Page<WebhookDlqDto>>> getDlqEntries(
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<WebhookDlqDto> entries = dlqService.getDlqEntries(status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(entries));
    }

    @PostMapping("/dlq/{id}/replay")
    @Operation(summary = "Replay specific DLQ webhook", description = "Attempts manual re-processing of a failed settlement webhook.")
    public ResponseEntity<ApiResponse<Boolean>> replayWebhook(@PathVariable UUID id) {
        boolean success = dlqService.replayWebhook(id);
        String message = success ? "Webhook reprocessed and resolved successfully" : "Webhook reprocessing failed";
        return ResponseEntity.ok(ApiResponse.success(message, success));
    }

    @PostMapping("/dlq/replay-all")
    @Operation(summary = "Bulk replay all eligible DLQ webhooks", description = "Replays all PENDING_RETRY and DEAD_LETTER entries.")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> replayAll() {
        Map<String, Integer> result = dlqService.replayAll();
        return ResponseEntity.ok(ApiResponse.success("Batch replay completed", result));
    }

    @DeleteMapping("/dlq/{id}")
    @Operation(summary = "Discard DLQ webhook", description = "Marks an unrecoverable webhook as DISCARDED.")
    public ResponseEntity<ApiResponse<Void>> discardWebhook(@PathVariable UUID id) {
        dlqService.discardWebhook(id);
        return ResponseEntity.ok(ApiResponse.success("Webhook discarded", null));
    }

    @GetMapping("/circuit-breaker")
    @Operation(summary = "Get Circuit Breaker status", description = "Returns live Resilience4j state, failure rate, and call counts.")
    public ResponseEntity<ApiResponse<CircuitBreakerStatusDto>> getCircuitBreakerStatus() {
        CircuitBreakerStatusDto status = dlqService.getCircuitBreakerStatus();
        return ResponseEntity.ok(ApiResponse.success(status));
    }

    @PostMapping("/circuit-breaker/reset")
    @Operation(summary = "Reset Circuit Breaker", description = "Manually resets the circuit breaker back to CLOSED state.")
    public ResponseEntity<ApiResponse<Void>> resetCircuitBreaker() {
        dlqService.resetCircuitBreaker();
        return ResponseEntity.ok(ApiResponse.success("Circuit breaker reset to CLOSED", null));
    }
}
