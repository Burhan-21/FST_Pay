package com.fstpay.reward.dto;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RewardsStatusResponse {
    private int points;
    private int xp;
    private int level;
    private int currentLevelXpBoundary;
    private int nextLevelXpBoundary;
    private int streakDays;
    private Instant lastStreakAt;
}
