package com.fstpay.parent.webauthn.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebAuthnRegisterRequest {

    @NotBlank(message = "Credential ID is required")
    private String credentialId;

    @NotBlank(message = "Public key is required")
    private String publicKey;

    private String rawId;
    private String clientDataJSON;
    private String attestationObject;
    private String deviceName;
    private String algorithm;
}
