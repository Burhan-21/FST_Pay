package com.fstpay.reward.dto;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BadgeResponse {
    private UUID id;
    private String name;
    private String displayName;
    private String description;
    private String icon;
    private boolean unlocked;
    private Instant unlockedAt;
}
