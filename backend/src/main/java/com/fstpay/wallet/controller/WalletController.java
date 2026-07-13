package com.fstpay.wallet.controller;

import com.fstpay.common.dto.ApiResponse;
import com.fstpay.wallet.dto.TopUpRequest;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.service.WalletService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/wallet")
@RequiredArgsConstructor
@Tag(name = "Wallet", description = "Endpoints for wallet balance retrieval and top-up operations")
public class WalletController {

    private final WalletService walletService;

    @GetMapping
    @Operation(summary = "Get wallet details", description = "Retrieves the active wallet balance, ledger reference, currency, and association details of the authenticated user.")
    public ResponseEntity<ApiResponse<Wallet>> getWallet(@AuthenticationPrincipal UserDetails userDetails) {
        Wallet wallet = walletService.getWalletByUserEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(wallet));
    }

    @PostMapping("/topup")
    @Operation(summary = "Top up wallet balance", description = "Adds funds to the user's wallet via a simulated payment gateway (like UPI or Card) and records a double-entry ledger event.")
    public ResponseEntity<ApiResponse<Wallet>> topUp(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody TopUpRequest request) {
        Wallet wallet = walletService.topUp(userDetails.getUsername(), request.getAmount(), request.getMethod());
        return ResponseEntity.ok(ApiResponse.success("Top-up successful", wallet));
    }
}
