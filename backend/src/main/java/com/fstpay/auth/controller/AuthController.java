package com.fstpay.auth.controller;

import com.fstpay.auth.dto.*;
import com.fstpay.auth.service.AuthService;
import com.fstpay.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints for user registration, login, OTP verification, token refreshes, and password resets")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Register a new user", description = "Creates a new user account (Teen or Parent) and dispatches a verification OTP to their email.")
    public ResponseEntity<ApiResponse<TokenResponse>> register(@Valid @RequestBody RegisterRequest request) {
        TokenResponse response = authService.register(request);
        return ResponseEntity.ok(ApiResponse.success("OTP sent to your email to verify account", response));
    }

    @PostMapping("/login")
    @Operation(summary = "Initiate user login", description = "Verifies password credentials and dispatches a second-factor OTP code via email.")
    public ResponseEntity<ApiResponse<TokenResponse>> login(@Valid @RequestBody LoginRequest request) {
        TokenResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("OTP sent to your email address", response));
    }

    @PostMapping("/verify-otp")
    @Operation(summary = "Verify OTP code", description = "Validates the emailed OTP code and returns access/refresh JWT tokens on success.")
    public ResponseEntity<ApiResponse<TokenResponse>> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        TokenResponse response = authService.verifyOtp(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @PostMapping("/totp/verify")
    @Operation(summary = "Verify TOTP authenticator code", description = "Validates the 6-digit TOTP code from an authenticator app and returns access/refresh JWT tokens on success.")
    public ResponseEntity<ApiResponse<TokenResponse>> verifyTotp(@Valid @RequestBody com.fstpay.auth.totp.dto.VerifyTotpRequest request) {
        TokenResponse response = authService.verifyTotp(request);
        return ResponseEntity.ok(ApiResponse.success("Authentication successful", response));
    }

    @PostMapping("/totp/verify-backup")
    @Operation(summary = "Verify emergency backup recovery code", description = "Validates an unused single-use backup code and returns access/refresh JWT tokens on success.")
    public ResponseEntity<ApiResponse<TokenResponse>> verifyBackupCode(@Valid @RequestBody com.fstpay.auth.totp.dto.VerifyBackupCodeRequest request) {
        TokenResponse response = authService.verifyBackupCode(request);
        return ResponseEntity.ok(ApiResponse.success("Emergency backup code accepted", response));
    }

    @PostMapping("/totp/fallback-email")
    @Operation(summary = "Request fallback email OTP", description = "Dispatches a fallback verification OTP code to user's registered email if authenticator device is lost.")
    public ResponseEntity<ApiResponse<TokenResponse>> fallbackEmailOtp(@RequestParam String email) {
        TokenResponse response = authService.sendTotpFallbackEmailOtp(email);
        return ResponseEntity.ok(ApiResponse.success("Verification code sent to your email address", response));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token", description = "Accepts a valid refresh token and generates a new short-lived access JWT token.")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(@Valid @RequestBody RefreshRequest request) {
        TokenResponse response = authService.refresh(request);
        return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully", response));
    }

    @PostMapping("/logout")
    @Operation(summary = "Log out user", description = "Invalidates the active refresh token and signs the user out.")
    public ResponseEntity<ApiResponse<String>> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        authService.logout(authHeader);
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }

    @PostMapping("/password-reset/request")
    @Operation(summary = "Request password reset", description = "Generates a reset token and sends an email to the user if the account exists.")
    public ResponseEntity<ApiResponse<String>> requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        authService.requestPasswordReset(request);
        return ResponseEntity.ok(ApiResponse.success("If the email exists, a password reset link has been sent.", null));
    }

    @PostMapping("/password-reset/confirm")
    @Operation(summary = "Confirm password reset", description = "Submits the password reset token and changes the user's password.")
    public ResponseEntity<ApiResponse<String>> confirmPasswordReset(@Valid @RequestBody ConfirmPasswordResetRequest request) {
        authService.confirmPasswordReset(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successfully. You can now login with your new password.", null));
    }

    @GetMapping("/stats")
    @Operation(summary = "Retrieve public platform stats", description = "Provides global metrics like total active users and transaction count for landing page.")
    public ResponseEntity<ApiResponse<StatsResponse>> getStats() {
        StatsResponse response = authService.getPublicStats();
        return ResponseEntity.ok(ApiResponse.success("Public statistics retrieved successfully", response));
    }
}
