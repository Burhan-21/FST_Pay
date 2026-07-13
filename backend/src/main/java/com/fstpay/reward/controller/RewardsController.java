package com.fstpay.reward.controller;

import com.fstpay.reward.dto.BadgeResponse;
import com.fstpay.reward.dto.RedeemResponse;
import com.fstpay.reward.dto.RewardsStatusResponse;
import com.fstpay.reward.entity.RewardItem;
import com.fstpay.reward.service.RewardsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rewards")
@RequiredArgsConstructor
public class RewardsController {

    private final RewardsService rewardsService;

    @GetMapping("/status")
    public ResponseEntity<RewardsStatusResponse> getStatus(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(rewardsService.getRewardsStatus(userDetails.getUsername()));
    }

    @GetMapping("/badges")
    public ResponseEntity<List<BadgeResponse>> getBadges(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(rewardsService.getUserBadges(userDetails.getUsername()));
    }

    @GetMapping("/catalog")
    public ResponseEntity<List<RewardItem>> getCatalog() {
        return ResponseEntity.ok(rewardsService.getRewardCatalog());
    }

    @GetMapping("/redemptions")
    public ResponseEntity<List<RedeemResponse>> getRedemptions(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(rewardsService.getRedemptionHistory(userDetails.getUsername()));
    }

    @PostMapping("/redeem/{itemId}")
    public ResponseEntity<RedeemResponse> redeemItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID itemId
    ) {
        return ResponseEntity.ok(rewardsService.redeemItem(userDetails.getUsername(), itemId));
    }

    @PostMapping("/streak")
    public ResponseEntity<RewardsStatusResponse> claimStreak(@AuthenticationPrincipal UserDetails userDetails) {
        rewardsService.claimDailyStreak(userDetails.getUsername());
        return ResponseEntity.ok(rewardsService.getRewardsStatus(userDetails.getUsername()));
    }
}
