package com.fstpay.auth.totp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TotpStatusResponse {
    private boolean totpEnabled;
    private long backupCodesRemaining;
}
