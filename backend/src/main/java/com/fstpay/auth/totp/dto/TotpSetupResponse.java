package com.fstpay.auth.totp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TotpSetupResponse {
    private String secret;
    private String otpauthUrl;
    private String qrCodeDataUri;
    private List<String> backupCodes;
}
