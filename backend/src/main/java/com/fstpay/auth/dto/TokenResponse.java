package com.fstpay.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fstpay.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TokenResponse {
    private String accessToken;
    private String refreshToken;
    private Long expiresIn;
    private Boolean requiresOtp;
    private User user;
}
