package com.fstpay.transaction.controller;

import com.fstpay.common.dto.ApiResponse;
import com.fstpay.transaction.dto.SimulateSpendRequest;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
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
    public ResponseEntity<ApiResponse<Transaction>> getTransaction(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        Transaction txn = transactionService.getTransactionById(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success(txn));
    }

    @PostMapping("/simulate")
    public ResponseEntity<ApiResponse<Transaction>> simulateSpend(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SimulateSpendRequest request) {
        Transaction txn = transactionService.simulateSpend(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Transaction simulated successfully", txn));
    }
}
