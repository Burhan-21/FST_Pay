package com.fstpay.parent.webauthn.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebAuthnRegistrationOptions {
    private String challenge;
    private RpEntity rp;
    private UserEntity user;
    private List<PubKeyCredParam> pubKeyCredParams;
    private Long timeout;
    private String attestation;
    private AuthenticatorSelection authenticatorSelection;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RpEntity {
        private String name;
        private String id;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserEntity {
        private String id;
        private String name;
        private String displayName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PubKeyCredParam {
        private String type; // "public-key"
        private Integer alg; // -7 (ES256), -257 (RS256)
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthenticatorSelection {
        private String authenticatorAttachment;
        private String userVerification;
        private Boolean requireResidentKey;
    }
}
