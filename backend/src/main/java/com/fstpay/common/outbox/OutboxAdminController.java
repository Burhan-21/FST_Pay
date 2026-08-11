package com.fstpay.common.outbox;

import com.fstpay.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/outbox")
@RequiredArgsConstructor
public class OutboxAdminController {

    private final OutboxAdminService outboxAdminService;

    @GetMapping("/statistics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatistics() {
        return ResponseEntity.ok(ApiResponse.success("Statistics retrieved successfully", outboxAdminService.statistics()));
    }

    @GetMapping("/dead-letter")
    public ResponseEntity<ApiResponse<List<OutboxEvent>>> getDeadLetterEvents() {
        return ResponseEntity.ok(ApiResponse.success("Dead letter events retrieved successfully", outboxAdminService.getDeadLetterEvents()));
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<ApiResponse<String>> retry(@PathVariable UUID id) {
        boolean success = outboxAdminService.retry(id);
        if (success) {
            return ResponseEntity.ok(ApiResponse.success("Outbox event queued for retry successfully", "SUCCESS"));
        }
        return ResponseEntity.badRequest().body(ApiResponse.error("Event not found or not in DEAD_LETTER/FAILED status"));
    }

    @PostMapping("/retry-all")
    public ResponseEntity<ApiResponse<Integer>> retryAll() {
        int count = outboxAdminService.retryAllDeadLetters();
        return ResponseEntity.ok(ApiResponse.success("Retried " + count + " dead letters successfully", count));
    }

    @PostMapping("/cleanup")
    public ResponseEntity<ApiResponse<Integer>> cleanup(
            @RequestParam(defaultValue = "7") int retentionDays,
            @RequestParam(defaultValue = "100") int batchSize) {
        int count = outboxAdminService.cleanup(retentionDays, batchSize);
        return ResponseEntity.ok(ApiResponse.success("Pruned " + count + " old sent outbox events successfully", count));
    }

    @PostMapping("/replay")
    public ResponseEntity<ApiResponse<Map<String, Object>>> replay(
            @RequestParam(required = false) List<UUID> ids,
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end,
            @RequestParam(required = false) String aggregateId,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String correlationId,
            @RequestParam(required = false) String topic,
            @RequestParam(defaultValue = "true") boolean dryRun) {

        java.time.Instant startInstant = null;
        java.time.Instant endInstant = null;
        if (start != null && !start.trim().isEmpty()) {
            startInstant = java.time.Instant.parse(start);
        }
        if (end != null && !end.trim().isEmpty()) {
            endInstant = java.time.Instant.parse(end);
        }

        Map<String, Object> result = outboxAdminService.executeReplay(
                ids, startInstant, endInstant, aggregateId, eventType, correlationId, topic, dryRun);
        String msg = dryRun ? "Replay dry run completed successfully" : "Replay executed successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, result));
    }
}
