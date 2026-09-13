package com.fstpay.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ObservabilityMetricsDto {

    // AI Coach & Cashflow Simulation
    private double monteCarloSimulationsSuccess;
    private double monteCarloSimulationsFailed;
    private double monteCarloAvgDurationMs;
    private double roundUpSweepsSuccess;
    private double roundUpSweepsInsufficientFunds;
    private double roundUpTotalAmountInr;

    // FX Engine
    private double fxQuotesRequested;
    private double fxConversionsExecuted;
    private double fxFeesCollectedInr;
    private double fxCacheHits;
    private double fxCacheMisses;
    private double fxCacheHitRatio;

    // Webhooks & Settlements
    private double webhooksReceivedValid;
    private double webhooksReceivedInvalid;
    private double webhooksSettled;
    private double webhooksDuplicates;
    private double webhooksMismatches;
    private double webhooksAvgProcessingDurationMs;

    // Biometrics & Parental Approvals
    private double webauthnRegistrationsSuccess;
    private double webauthnRegistrationsFailed;
    private double webauthnVerificationsSuccess;
    private double webauthnVerificationsFailed;
    private double guardianApprovalsApproved;
    private double guardianApprovalsRejected;
    private double guardianApprovalsBiometric;
    private double guardianApprovalsManual;

    // Scheduled Allowance Sweeps & Goal Milestones
    private double allowanceSweepsSuccess;
    private double allowanceSweepsInsufficientFunds;
    private double allowanceSweepsError;
    private double allowanceTotalAmountInr;
    private double goalMilestonesReached;

    // System & Runtime
    private double jvmMemoryUsedMb;
    private double jvmMemoryMaxMb;
    private double systemCpuUsage;
    private double uptimeSeconds;
}
