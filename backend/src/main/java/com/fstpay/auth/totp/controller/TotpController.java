package com.fstpay.auth.totp.controller;

import com.fstpay.auth.totp.TotpService;
import com.fstpay.auth.totp.dto.*;
import com.fstpay.auth.totp.entity.UserBackupCode;
import com.fstpay.auth.totp.repository.UserBackupCodeRepository;
import com.fstpay.common.dto.ApiResponse;
import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.common.service.AuditService;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/user/totp")
@RequiredArgsConstructor
@Tag(name = "Two-Factor Authentication (TOTP)", description = "Endpoints for managing Authenticator app 2FA enrollment, backup recovery codes, and status")
public class TotpController {

    private final TotpService totpService;
    private final UserRepository userRepository;
    private final UserBackupCodeRepository userBackupCodeRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @GetMapping("/status")
    @Operation(summary = "Get 2FA TOTP status", description = "Retrieves whether TOTP 2FA is active and the number of remaining emergency backup codes.")
    public ResponseEntity<ApiResponse<TotpStatusResponse>> getStatus(@AuthenticationPrincipal UserDetails userDetails) {
        User user = getUser(userDetails.getUsername());
        long remainingCodes = userBackupCodeRepository.countByUserAndUsedFalse(user);
        TotpStatusResponse response = TotpStatusResponse.builder()
                .totpEnabled(Boolean.TRUE.equals(user.getTotpEnabled()))
                .backupCodesRemaining(remainingCodes)
                .build();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/setup")
    @Operation(summary = "Initialize TOTP setup", description = "Generates a fresh Base32 secret, QR code PNG Data URI, and emergency backup codes for 2FA enrollment.")
    public ResponseEntity<ApiResponse<TotpSetupResponse>> setup(@AuthenticationPrincipal UserDetails userDetails) {
        User user = getUser(userDetails.getUsername());
        String secret = totpService.generateSecret();
        String otpauthUrl = totpService.generateOtpauthUrl(user.getEmail(), secret);
        String qrCodeDataUri = totpService.generateQrCodeDataUri(otpauthUrl);
        List<String> backupCodes = totpService.generateBackupCodes();

        TotpSetupResponse response = TotpSetupResponse.builder()
                .secret(secret)
                .otpauthUrl(otpauthUrl)
                .qrCodeDataUri(qrCodeDataUri)
                .backupCodes(backupCodes)
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/enable")
    @Transactional
    @Operation(summary = "Confirm & activate TOTP 2FA", description = "Validates the 6-digit code with the secret and activates TOTP protection, saving hashed emergency backup codes.")
    public ResponseEntity<ApiResponse<TotpStatusResponse>> enableTotp(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody EnableTotpRequest request) {
        User user = getUser(userDetails.getUsername());

        if (!totpService.verifyCode(request.getSecret(), request.getCode())) {
            auditService.logAuthEvent(user.getEmail(), "TOTP_ENABLE_FAILED", "Invalid verification code supplied during setup");
            throw new BadRequestException("Invalid 6-digit verification code. Please check your authenticator app.");
        }

        user.setTotpSecret(request.getSecret());
        user.setTotpEnabled(true);
        userRepository.save(user);

        // Replace any existing backup codes with the new set
        userBackupCodeRepository.deleteByUser(user);
        if (request.getBackupCodes() != null) {
            for (String code : request.getBackupCodes()) {
                String hash = totpService.hashBackupCode(code);
                UserBackupCode entity = UserBackupCode.builder()
                        .user(user)
                        .codeHash(hash)
                        .used(false)
                        .build();
                userBackupCodeRepository.save(entity);
            }
        }

        auditService.logAuthEvent(user.getEmail(), "TOTP_ENABLED", "Two-factor authentication enabled successfully");
        log.info("TOTP enabled for user: {}", user.getEmail());

        long count = userBackupCodeRepository.countByUserAndUsedFalse(user);
        TotpStatusResponse response = TotpStatusResponse.builder()
                .totpEnabled(true)
                .backupCodesRemaining(count)
                .build();

        return ResponseEntity.ok(ApiResponse.success("Two-factor authentication enabled successfully", response));
    }

    @PostMapping("/disable")
    @Transactional
    @Operation(summary = "Disable TOTP 2FA", description = "Deactivates TOTP protection and wipes stored backup codes after password or TOTP verification.")
    public ResponseEntity<ApiResponse<TotpStatusResponse>> disableTotp(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody DisableTotpRequest request) {
        User user = getUser(userDetails.getUsername());

        boolean authorized = false;
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            if (passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
                authorized = true;
            }
        }
        if (!authorized && request.getCode() != null && !request.getCode().isBlank()) {
            if (user.getTotpSecret() != null && totpService.verifyCode(user.getTotpSecret(), request.getCode())) {
                authorized = true;
            }
        }

        if (!authorized) {
            auditService.logAuthEvent(user.getEmail(), "TOTP_DISABLE_FAILED", "Unauthorized attempt to disable TOTP");
            throw new BadRequestException("Invalid password or verification code.");
        }

        user.setTotpEnabled(false);
        user.setTotpSecret(null);
        userRepository.save(user);

        userBackupCodeRepository.deleteByUser(user);

        auditService.logAuthEvent(user.getEmail(), "TOTP_DISABLED", "Two-factor authentication disabled");
        log.info("TOTP disabled for user: {}", user.getEmail());

        TotpStatusResponse response = TotpStatusResponse.builder()
                .totpEnabled(false)
                .backupCodesRemaining(0)
                .build();

        return ResponseEntity.ok(ApiResponse.success("Two-factor authentication disabled", response));
    }

    @PostMapping("/backup-codes/regenerate")
    @Transactional
    @Operation(summary = "Regenerate emergency backup codes", description = "Generates a fresh set of 8 emergency backup codes, invalidating previous unused codes.")
    public ResponseEntity<ApiResponse<List<String>>> regenerateBackupCodes(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String code) {
        User user = getUser(userDetails.getUsername());

        if (!Boolean.TRUE.equals(user.getTotpEnabled())) {
            throw new BadRequestException("TOTP is not enabled for this account.");
        }

        if (code != null && !code.isBlank() && !totpService.verifyCode(user.getTotpSecret(), code)) {
            auditService.logAuthEvent(user.getEmail(), "BACKUP_REGEN_FAILED", "Invalid TOTP code during backup code regeneration");
            throw new BadRequestException("Invalid 6-digit verification code.");
        }

        userBackupCodeRepository.deleteByUser(user);
        List<String> newCodes = totpService.generateBackupCodes();

        for (String c : newCodes) {
            String hash = totpService.hashBackupCode(c);
            UserBackupCode entity = UserBackupCode.builder()
                    .user(user)
                    .codeHash(hash)
                    .used(false)
                    .build();
            userBackupCodeRepository.save(entity);
        }

        auditService.logAuthEvent(user.getEmail(), "BACKUP_CODES_REGENERATED", "Emergency backup codes regenerated");
        log.info("Backup codes regenerated for user: {}", user.getEmail());

        return ResponseEntity.ok(ApiResponse.success("Backup codes regenerated successfully", newCodes));
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }
}
