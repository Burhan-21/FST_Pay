package com.fstpay.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebAuthnLoginRequest {

    @NotBlank(message = "Credential ID is required")
    private String credentialId;

    @NotBlank(message = "clientDataJSON is required")
    private String clientDataJSON;

    @NotBlank(message = "authenticatorData is required")
    private String authenticatorData;

    @NotBlank(message = "signature is required")
    private String signature;

    private String userHandle;
}
