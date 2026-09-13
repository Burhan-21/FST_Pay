package com.fstpay.parent.webauthn.controller;

import com.fstpay.common.dto.ApiResponse;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.parent.webauthn.dto.*;
import com.fstpay.parent.webauthn.entity.UserWebAuthnCredential;
import com.fstpay.parent.webauthn.service.WebAuthnService;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/parental/webauthn")
@RequiredArgsConstructor
@Tag(name = "Parental Biometrics & WebAuthn", description = "Endpoints for guardian FIDO2 passkey registration, credential management, and biometric approval challenges")
public class ParentalWebAuthnController {

    private final WebAuthnService webAuthnService;
    private final UserRepository userRepository;

    @GetMapping("/register/options")
    @Operation(summary = "Generate registration options", description = "Generates WebAuthn PublicKeyCredentialCreationOptions challenge for parent biometric enrollment.")
    public ResponseEntity<ApiResponse<WebAuthnRegistrationOptions>> getRegistrationOptions(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getUser(userDetails.getUsername());
        WebAuthnRegistrationOptions options = webAuthnService.generateRegistrationOptions(user);
        return ResponseEntity.ok(ApiResponse.success(options));
    }

    @PostMapping("/register/verify")
    @Operation(summary = "Verify registration response", description = "Verifies parent's biometric authenticator attestation and registers the passkey.")
    public ResponseEntity<ApiResponse<WebAuthnCredentialDto>> verifyRegistration(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody WebAuthnRegisterRequest request) {
        User user = getUser(userDetails.getUsername());
        UserWebAuthnCredential credential = webAuthnService.verifyRegistration(user, request);
        WebAuthnCredentialDto dto = WebAuthnCredentialDto.builder()
                .id(credential.getId())
                .credentialId(credential.getCredentialId())
                .algorithm(credential.getAlgorithm())
                .deviceName(credential.getDeviceName())
                .signCount(credential.getSignCount())
                .createdAt(credential.getCreatedAt())
                .lastUsedAt(credential.getLastUsedAt())
                .build();
        return ResponseEntity.ok(ApiResponse.success("Biometric passkey registered successfully", dto));
    }

    @GetMapping("/credentials")
    @Operation(summary = "List registered passkeys", description = "Retrieves all enrolled WebAuthn biometric authenticators for the parent.")
    public ResponseEntity<ApiResponse<List<WebAuthnCredentialDto>>> getCredentials(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getUser(userDetails.getUsername());
        List<WebAuthnCredentialDto> credentials = webAuthnService.getCredentialsForUser(user);
        return ResponseEntity.ok(ApiResponse.success(credentials));
    }

    @DeleteMapping("/credentials/{id}")
    @Operation(summary = "Delete passkey", description = "Removes a registered biometric authenticator for the parent.")
    public ResponseEntity<ApiResponse<String>> deleteCredential(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        User user = getUser(userDetails.getUsername());
        webAuthnService.deleteCredential(user, id);
        return ResponseEntity.ok(ApiResponse.success("Biometric passkey removed", null));
    }

    @GetMapping("/approvals/{id}/challenge")
    @Operation(summary = "Get approval biometric challenge", description = "Generates an authentication challenge specifically scoped to co-signing a transaction approval.")
    public ResponseEntity<ApiResponse<WebAuthnAuthenticationOptions>> getApprovalChallenge(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        User user = getUser(userDetails.getUsername());
        WebAuthnAuthenticationOptions options = webAuthnService.generateApprovalChallenge(user, id);
        return ResponseEntity.ok(ApiResponse.success(options));
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }
}
