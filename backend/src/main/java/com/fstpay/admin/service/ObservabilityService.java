package com.fstpay.admin.service;

import com.fstpay.admin.dto.ObservabilityMetricsDto;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class ObservabilityService {

    private final MeterRegistry meterRegistry;

    public ObservabilityMetricsDto getObservabilityMetrics() {
        // AI Coach & Cashflow
        double mcSuccess = sumCounters("fstpay.aicoach.cashflow.simulations.total", "status", "success");
        double mcFailed = sumCounters("fstpay.aicoach.cashflow.simulations.total", "status", "failure");
        double mcDuration = getTimerMeanMs("fstpay.aicoach.cashflow.simulation.duration");
        double roundUpSuccess = sumCounters("fstpay.aicoach.roundup.sweeps.total", "status", "success");
        double roundUpNoFunds = sumCounters("fstpay.aicoach.roundup.sweeps.total", "status", "insufficient_funds");
        double roundUpAmount = sumCounters("fstpay.aicoach.roundup.amount.total");

        // FX Engine
        double fxQuotes = sumCounters("fstpay.fx.quotes.requested.total");
        double fxConversions = sumCounters("fstpay.fx.conversions.executed.total");
        double fxFees = sumCounters("fstpay.fx.fee.collected.total");
        double fxHits = sumCounters("fstpay.fx.cache.hits.total");
        double fxMisses = sumCounters("fstpay.fx.cache.misses.total");
        double hitRatio = (fxHits + fxMisses > 0) ? (fxHits / (fxHits + fxMisses)) * 100.0 : 100.0;

        // Webhooks
        double webhooksValid = sumCounters("fstpay.webhooks.received.total", "status", "valid");
        double webhooksInvalid = sumCounters("fstpay.webhooks.received.total", "status", "invalid_signature");
        double webhooksSettled = sumCounters("fstpay.webhooks.settlements.processed.total", "status", "settled");
        double webhooksDupes = sumCounters("fstpay.webhooks.settlements.processed.total", "status", "already_settled");
        double webhooksMismatches = sumCounters("fstpay.webhooks.settlements.processed.total", "status", "mismatch");
        double webhooksDuration = getTimerMeanMs("fstpay.webhooks.processing.duration");

        // WebAuthn & Parental Approvals
        double passkeyRegSuccess = sumCounters("fstpay.webauthn.registrations.total", "status", "success");
        double passkeyRegFailed = sumCounters("fstpay.webauthn.registrations.total", "status", "failure");
        double passkeyAuthSuccess = sumCounters("fstpay.webauthn.verifications.total", "status", "success");
        double passkeyAuthFailed = sumCounters("fstpay.webauthn.verifications.total", "status", "failure");
        double approvalsApproved = sumCounters("fstpay.parental.approvals.decided.total", "decision", "approved");
        double approvalsRejected = sumCounters("fstpay.parental.approvals.decided.total", "decision", "rejected");
        double approvalsBiometric = sumCounters("fstpay.parental.approvals.decided.total", "auth_type", "biometric_passkey");
        double approvalsManual = sumCounters("fstpay.parental.approvals.decided.total", "auth_type", "manual");

        // Scheduled Allowance Sweeps & Goal Milestones
        double allowanceSuccess = sumCounters("fstpay.allowance.sweeps.total", "status", "success");
        double allowanceNoFunds = sumCounters("fstpay.allowance.sweeps.total", "status", "insufficient_funds");
        double allowanceError = sumCounters("fstpay.allowance.sweeps.total", "status", "error");
        double allowanceAmount = sumCounters("fstpay.allowance.amount.total");
        double goalMilestones = sumCounters("fstpay.goal.milestones.reached.total");

        // JVM & Runtime
        Runtime rt = Runtime.getRuntime();
        double usedMb = Math.round(((double) (rt.totalMemory() - rt.freeMemory()) / (1024 * 1024)) * 100.0) / 100.0;
        double maxMb = Math.round(((double) rt.maxMemory() / (1024 * 1024)) * 100.0) / 100.0;
        double uptimeSec = Math.round((double) ManagementFactory.getRuntimeMXBean().getUptime() / 1000.0);

        double cpu = 0.0;
        try {
            var cpuGauge = meterRegistry.find("system.cpu.usage").gauge();
            if (cpuGauge != null) {
                cpu = Math.round(cpuGauge.value() * 10000.0) / 100.0; // percentage
            }
        } catch (Exception ignored) {}

        return ObservabilityMetricsDto.builder()
                .monteCarloSimulationsSuccess(mcSuccess)
                .monteCarloSimulationsFailed(mcFailed)
                .monteCarloAvgDurationMs(Math.round(mcDuration * 100.0) / 100.0)
                .roundUpSweepsSuccess(roundUpSuccess)
                .roundUpSweepsInsufficientFunds(roundUpNoFunds)
                .roundUpTotalAmountInr(Math.round(roundUpAmount * 100.0) / 100.0)
                .fxQuotesRequested(fxQuotes)
                .fxConversionsExecuted(fxConversions)
                .fxFeesCollectedInr(Math.round(fxFees * 100.0) / 100.0)
                .fxCacheHits(fxHits)
                .fxCacheMisses(fxMisses)
                .fxCacheHitRatio(Math.round(hitRatio * 10.0) / 10.0)
                .webhooksReceivedValid(webhooksValid)
                .webhooksReceivedInvalid(webhooksInvalid)
                .webhooksSettled(webhooksSettled)
                .webhooksDuplicates(webhooksDupes)
                .webhooksMismatches(webhooksMismatches)
                .webhooksAvgProcessingDurationMs(Math.round(webhooksDuration * 100.0) / 100.0)
                .webauthnRegistrationsSuccess(passkeyRegSuccess)
                .webauthnRegistrationsFailed(passkeyRegFailed)
                .webauthnVerificationsSuccess(passkeyAuthSuccess)
                .webauthnVerificationsFailed(passkeyAuthFailed)
                .guardianApprovalsApproved(approvalsApproved)
                .guardianApprovalsRejected(approvalsRejected)
                .guardianApprovalsBiometric(approvalsBiometric)
                .guardianApprovalsManual(approvalsManual)
                .allowanceSweepsSuccess(allowanceSuccess)
                .allowanceSweepsInsufficientFunds(allowanceNoFunds)
                .allowanceSweepsError(allowanceError)
                .allowanceTotalAmountInr(Math.round(allowanceAmount * 100.0) / 100.0)
                .goalMilestonesReached(goalMilestones)
                .jvmMemoryUsedMb(usedMb)
                .jvmMemoryMaxMb(maxMb)
                .systemCpuUsage(cpu)
                .uptimeSeconds(uptimeSec)
                .build();
    }

    private double sumCounters(String name, String... tags) {
        try {
            var search = meterRegistry.find(name);
            if (tags != null && tags.length >= 2) {
                for (int i = 0; i < tags.length; i += 2) {
                    search.tag(tags[i], tags[i + 1]);
                }
            }
            return search.counters().stream().mapToDouble(Counter::count).sum();
        } catch (Exception e) {
            return 0.0;
        }
    }

    private double getTimerMeanMs(String name, String... tags) {
        try {
            var search = meterRegistry.find(name);
            if (tags != null && tags.length >= 2) {
                for (int i = 0; i < tags.length; i += 2) {
                    search.tag(tags[i], tags[i + 1]);
                }
            }
            Timer timer = search.timer();
            return timer != null ? timer.mean(TimeUnit.MILLISECONDS) : 0.0;
        } catch (Exception e) {
            return 0.0;
        }
    }
}
