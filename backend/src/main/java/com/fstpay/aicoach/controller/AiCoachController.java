package com.fstpay.aicoach.controller;

import com.fstpay.aicoach.dto.ChatRequest;
import com.fstpay.aicoach.dto.ChatResponse;
import com.fstpay.aicoach.dto.HealthScoreResponse;
import com.fstpay.aicoach.dto.ForecastResponse;
import com.fstpay.aicoach.dto.BudgetPlanningResponse;
import com.fstpay.aicoach.service.AiCoachService;
import com.fstpay.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/ai-coach")
@RequiredArgsConstructor
@Tag(name = "AI Coach", description = "Endpoints for interacting with the AI financial coach, retrieving health scores, budgets, and projections")
public class AiCoachController {

    private final AiCoachService aiCoachService;

    @PostMapping("/chat")
    @Operation(summary = "Chat with AI coach", description = "Asks the AI financial advisor a question. Sends the user's transaction profile context for personalized replies.")
    public ResponseEntity<ApiResponse<ChatResponse>> chat(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ChatRequest request) {
        ChatResponse response = aiCoachService.chat(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/health-score")
    @Operation(summary = "Get financial health score", description = "Calculates a dynamic score (0-100) based on savings rate, budget adherence, streak, and transaction consistency.")
    public ResponseEntity<ApiResponse<HealthScoreResponse>> getHealthScore(
            @AuthenticationPrincipal UserDetails userDetails) {
        HealthScoreResponse response = aiCoachService.getHealthScore(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/tips")
    @Operation(summary = "Get personalized tips", description = "Returns a curated set of financial tips using matching heuristics over user goals and analytics.")
    public ResponseEntity<ApiResponse<List<String>>> getTips(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<String> response = aiCoachService.getPersonalizedTips(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/forecast")
    @Operation(summary = "Get future spending forecast", description = "Generates a 30-day cumulative spending forecast using daily averages trend analysis.")
    public ResponseEntity<ApiResponse<ForecastResponse>> getForecast(
            @AuthenticationPrincipal UserDetails userDetails) {
        ForecastResponse response = aiCoachService.getForecast(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/budget")
    @Operation(summary = "Get budget allocation comparison", description = "Compares actual user category spending ratios against the standard 50/30/20 budget framework.")
    public ResponseEntity<ApiResponse<BudgetPlanningResponse>> getBudgetPlan(
            @AuthenticationPrincipal UserDetails userDetails) {
        BudgetPlanningResponse response = aiCoachService.getBudgetPlan(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/alerts")
    @Operation(summary = "Get proactive budget anomaly alerts", description = "Retrieves real-time detected budget anomalies and overspending spikes for the authenticated user.")
    public ResponseEntity<ApiResponse<List<com.fstpay.aicoach.dto.AiBudgetAnomalyDto>>> getAlerts(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<com.fstpay.aicoach.dto.AiBudgetAnomalyDto> alerts = aiCoachService.detectAnomalies(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(alerts));
    }

    @PostMapping("/scan")
    @Operation(summary = "Run on-demand proactive scan", description = "Executes an immediate financial diagnostic scan, generates notifications and SSE alerts for detected anomalies.")
    public ResponseEntity<ApiResponse<List<com.fstpay.aicoach.dto.AiBudgetAnomalyDto>>> runScan(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<com.fstpay.aicoach.dto.AiBudgetAnomalyDto> alerts = aiCoachService.runProactiveScan(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Proactive scan completed successfully", alerts));
    }
}
