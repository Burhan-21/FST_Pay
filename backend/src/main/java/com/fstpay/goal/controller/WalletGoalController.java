package com.fstpay.goal.controller;

import com.fstpay.common.dto.ApiResponse;
import com.fstpay.goal.dto.GoalCreateRequest;
import com.fstpay.goal.dto.GoalFundRequest;
import com.fstpay.goal.dto.GoalResponse;
import com.fstpay.goal.dto.UpdateGoalRequest;
import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.goal.service.WalletGoalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/goals")
@RequiredArgsConstructor
@Tag(name = "Savings Goals", description = "Endpoints for creating, managing, allocating, and withdrawing from targeted teenager savings goals")
public class WalletGoalController {

    private final WalletGoalService walletGoalService;

    @PostMapping
    @Operation(summary = "Create a savings goal", description = "Creates a new active savings goal for the teenager with a name, target amount, date, and priority details.")
    public ResponseEntity<ApiResponse<GoalResponse>> createGoal(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody GoalCreateRequest request) {
        WalletGoal goal = walletGoalService.createGoal(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success(GoalResponse.fromEntity(goal)));
    }

    @GetMapping
    @Operation(summary = "Get all savings goals", description = "Retrieves a list of all active, completed, or cancelled savings goals for the user.")
    public ResponseEntity<ApiResponse<List<GoalResponse>>> getGoals(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<WalletGoal> goals = walletGoalService.getGoalsByUserEmail(userDetails.getUsername());
        List<GoalResponse> responses = goals.stream()
                .map(GoalResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get savings goal by ID", description = "Retrieves details of a specific savings goal using its UUID.")
    public ResponseEntity<ApiResponse<GoalResponse>> getGoal(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        WalletGoal goal = walletGoalService.getGoalByIdAndUser(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success(GoalResponse.fromEntity(goal)));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update savings goal details", description = "Modifies savings goal parameters like target amount, date, color, or priority.")
    public ResponseEntity<ApiResponse<GoalResponse>> updateGoal(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @RequestBody UpdateGoalRequest request) {
        WalletGoal goal = walletGoalService.updateGoal(userDetails.getUsername(), id, request);
        return ResponseEntity.ok(ApiResponse.success(GoalResponse.fromEntity(goal)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Cancel savings goal", description = "Permanently cancels the savings goal. Any allocated funds are automatically refunded back to the main wallet balance.")
    public ResponseEntity<ApiResponse<Void>> deleteGoal(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        walletGoalService.deleteGoal(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/{id}/allocate")
    @Operation(summary = "Allocate wallet funds to goal", description = "Deducts funds from the main wallet balance and moves them into the savings goal balance. Automatically completes the goal and awards XP/points if target is met.")
    public ResponseEntity<ApiResponse<GoalResponse>> allocateFunds(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody GoalFundRequest request) {
        WalletGoal goal = walletGoalService.allocateFunds(userDetails.getUsername(), id, request);
        return ResponseEntity.ok(ApiResponse.success(GoalResponse.fromEntity(goal)));
    }

    @PostMapping("/{id}/withdraw")
    @Operation(summary = "Withdraw funds from goal", description = "Withdraws saved funds from the goal, refunding them back to the user's main wallet balance.")
    public ResponseEntity<ApiResponse<GoalResponse>> withdrawFunds(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody GoalFundRequest request) {
        WalletGoal goal = walletGoalService.withdrawFunds(userDetails.getUsername(), id, request);
        return ResponseEntity.ok(ApiResponse.success(GoalResponse.fromEntity(goal)));
    }
}
