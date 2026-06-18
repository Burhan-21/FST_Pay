package com.fstpay.wallet.controller;

import com.fstpay.common.dto.ApiResponse;
import com.fstpay.wallet.dto.TopUpRequest;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.service.WalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @GetMapping
    public ResponseEntity<ApiResponse<Wallet>> getWallet(@AuthenticationPrincipal UserDetails userDetails) {
        Wallet wallet = walletService.getWalletByUserEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(wallet));
    }

    @PostMapping("/topup")
    public ResponseEntity<ApiResponse<Wallet>> topUp(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody TopUpRequest request) {
        Wallet wallet = walletService.topUp(userDetails.getUsername(), request.getAmount(), request.getMethod());
        return ResponseEntity.ok(ApiResponse.success("Top-up successful", wallet));
    }
}
