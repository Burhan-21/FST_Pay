package com.fstpay.parent.webauthn.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebAuthnCredentialDto {

    private UUID id;
    private String credentialId;
    private String algorithm;
    private String deviceName;
    private Long signCount;
    private Instant createdAt;
    private Instant lastUsedAt;
}
