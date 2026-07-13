package com.fstpay.reward.dto;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RedeemResponse {
    private UUID id;
    private String title;
    private String description;
    private String codeClaimed;
    private Instant redeemedAt;
}
