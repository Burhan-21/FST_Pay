package com.fstpay.transaction.controller;

import com.fstpay.common.dto.ApiResponse;
import com.fstpay.transaction.dto.SimulateSpendRequest;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.service.TransactionService;
import org.springframework.http.HttpStatus;
import com.fstpay.transaction.dto.SpendSimulationResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
@Tag(name = "Transactions", description = "Endpoints for retrieving history, simulating virtual card spends, and exporting statements")
public class TransactionController {

    private final TransactionService transactionService;
    private final com.fstpay.transaction.service.SplitPaymentService splitPaymentService;

    @GetMapping
    @Operation(summary = "Get transaction history", description = "Fetches a paginated list of transactions for the authenticated user, optionally filtered by category and debit/credit type.")
    public ResponseEntity<ApiResponse<Page<Transaction>>> getTransactions(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<Transaction> txns = transactionService.getTransactions(userDetails.getUsername(), category, type, page, size);
        return ResponseEntity.ok(ApiResponse.success(txns));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get transaction by ID", description = "Retrieves the full details of a specific transaction using its UUID.")
    public ResponseEntity<ApiResponse<Transaction>> getTransaction(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        Transaction txn = transactionService.getTransactionById(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success(txn));
    }

    @com.fstpay.common.idempotency.annotation.Idempotent
    @PostMapping("/simulate")
    @Operation(summary = "Simulate a card purchase", description = "Simulates a debit spend on the user's virtual prepaid card. Evaluates transaction rules and triggers approvals if needed.")
    public ResponseEntity<ApiResponse<?>> simulateSpend(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SimulateSpendRequest request) {
        SpendSimulationResult result = transactionService.simulateSpend(userDetails.getUsername(), request);
        if (result.isRequiresApproval()) {
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(ApiResponse.success(result.getMessage(), result));
        }
        return ResponseEntity.ok(ApiResponse.success(result.getMessage(), result.getTransaction()));
    }

    @com.fstpay.common.idempotency.annotation.Idempotent
    @PostMapping("/split")
    @Operation(summary = "Execute split payment", description = "Debits the user's calculated share of a shared bill/QR payment and persists a split payment record.")
    public ResponseEntity<ApiResponse<com.fstpay.transaction.entity.SplitPayment>> executeSplitPayment(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody com.fstpay.transaction.dto.SplitPaymentRequest request) {
        com.fstpay.transaction.entity.SplitPayment result = splitPaymentService.executeSplitPayment(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Split payment processed successfully", result));
    }

    @GetMapping("/split")
    @Operation(summary = "Get user split payments", description = "Retrieves split payments initiated by the authenticated user.")
    public ResponseEntity<ApiResponse<java.util.List<com.fstpay.transaction.entity.SplitPayment>>> getSplitPayments(
            @AuthenticationPrincipal UserDetails userDetails) {
        java.util.List<com.fstpay.transaction.entity.SplitPayment> splits = splitPaymentService.getUserSplitPayments(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(splits));
    }

    @GetMapping("/export")
    @Operation(summary = "Export transaction history", description = "Downloads transaction statement as a PDF file or a CSV spreadsheet.")
    public ResponseEntity<InputStreamResource> exportTransactions(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "csv") String format) {
        String email = userDetails.getUsername();

        if ("pdf".equalsIgnoreCase(format)) {
            ByteArrayInputStream bis = transactionService.exportTransactionsPdf(email);
            HttpHeaders headers = new HttpHeaders();
            headers.add("Content-Disposition", "attachment; filename=transactions.pdf");
            return ResponseEntity
                    .ok()
                    .headers(headers)
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(new InputStreamResource(bis));
        } else {
            String csvData = transactionService.exportTransactionsCsv(email);
            ByteArrayInputStream bis = new ByteArrayInputStream(csvData.getBytes(StandardCharsets.UTF_8));
            HttpHeaders headers = new HttpHeaders();
            headers.add("Content-Disposition", "attachment; filename=transactions.csv");
            return ResponseEntity
                    .ok()
                    .headers(headers)
                    .contentType(MediaType.parseMediaType("text/csv"))
                    .body(new InputStreamResource(bis));
        }
    }
}
