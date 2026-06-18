package com.fstpay.reward.controller;

import com.fstpay.common.dto.ApiResponse;
import com.fstpay.reward.entity.RewardHistory;
import com.fstpay.reward.entity.RewardPoints;
import com.fstpay.reward.service.RewardsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/rewards")
@RequiredArgsConstructor
public class RewardsController {

    private final RewardsService rewardsService;

    @GetMapping
    public ResponseEntity<ApiResponse<RewardPoints>> getRewards(@AuthenticationPrincipal UserDetails userDetails) {
        RewardPoints points = rewardsService.getRewardPoints(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(points));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<Page<RewardHistory>>> getRewardHistory(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<RewardHistory> history = rewardsService.getRewardHistory(userDetails.getUsername(), page, size);
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    @PostMapping("/claim-streak")
    public ResponseEntity<ApiResponse<RewardPoints>> claimStreak(@AuthenticationPrincipal UserDetails userDetails) {
        RewardPoints points = rewardsService.claimDailyStreak(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Streak claimed successfully", points));
    }
}
