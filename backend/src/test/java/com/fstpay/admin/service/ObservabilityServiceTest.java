package com.fstpay.admin.service;

import com.fstpay.admin.dto.ObservabilityMetricsDto;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ObservabilityServiceTest {

    private MeterRegistry meterRegistry;
    private ObservabilityService observabilityService;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        observabilityService = new ObservabilityService(meterRegistry);
    }

    @Test
    void getObservabilityMetrics_ReturnsAggregatedMetrics() {
        // Record test metrics
        meterRegistry.counter("fstpay.aicoach.cashflow.simulations.total", "status", "success", "model", "monte_carlo").increment(5);
        meterRegistry.counter("fstpay.aicoach.cashflow.simulations.total", "status", "failure", "model", "monte_carlo").increment(1);
        meterRegistry.counter("fstpay.aicoach.roundup.sweeps.total", "status", "success", "nearest", "10").increment(3);
        meterRegistry.counter("fstpay.aicoach.roundup.amount.total").increment(27.50);

        meterRegistry.counter("fstpay.fx.quotes.requested.total", "from", "USD", "to", "INR").increment(8);
        meterRegistry.counter("fstpay.fx.conversions.executed.total", "from", "USD", "to", "INR").increment(2);
        meterRegistry.counter("fstpay.fx.fee.collected.total", "currency", "INR").increment(45.20);
        meterRegistry.counter("fstpay.fx.cache.hits.total").increment(7);
        meterRegistry.counter("fstpay.fx.cache.misses.total").increment(1);

        meterRegistry.counter("fstpay.webhooks.received.total", "status", "valid").increment(12);
        meterRegistry.counter("fstpay.webhooks.received.total", "status", "invalid_signature").increment(2);
        meterRegistry.counter("fstpay.webhooks.settlements.processed.total", "status", "settled").increment(10);
        meterRegistry.counter("fstpay.webhooks.settlements.processed.total", "status", "already_settled").increment(2);

        meterRegistry.counter("fstpay.webauthn.registrations.total", "algorithm", "ES256", "status", "success").increment(4);
        meterRegistry.counter("fstpay.webauthn.verifications.total", "status", "success").increment(9);
        meterRegistry.counter("fstpay.parental.approvals.decided.total", "decision", "approved", "auth_type", "biometric_passkey").increment(6);
        meterRegistry.counter("fstpay.parental.approvals.decided.total", "decision", "rejected", "auth_type", "manual").increment(1);

        ObservabilityMetricsDto dto = observabilityService.getObservabilityMetrics();

        assertNotNull(dto);
        assertEquals(5.0, dto.getMonteCarloSimulationsSuccess());
        assertEquals(1.0, dto.getMonteCarloSimulationsFailed());
        assertEquals(3.0, dto.getRoundUpSweepsSuccess());
        assertEquals(27.50, dto.getRoundUpTotalAmountInr());

        assertEquals(8.0, dto.getFxQuotesRequested());
        assertEquals(2.0, dto.getFxConversionsExecuted());
        assertEquals(45.20, dto.getFxFeesCollectedInr());
        assertEquals(7.0, dto.getFxCacheHits());
        assertEquals(1.0, dto.getFxCacheMisses());
        assertEquals(87.5, dto.getFxCacheHitRatio());

        assertEquals(12.0, dto.getWebhooksReceivedValid());
        assertEquals(2.0, dto.getWebhooksReceivedInvalid());
        assertEquals(10.0, dto.getWebhooksSettled());
        assertEquals(2.0, dto.getWebhooksDuplicates());

        assertEquals(4.0, dto.getWebauthnRegistrationsSuccess());
        assertEquals(9.0, dto.getWebauthnVerificationsSuccess());
        assertEquals(6.0, dto.getGuardianApprovalsApproved());
        assertEquals(1.0, dto.getGuardianApprovalsRejected());
        assertEquals(6.0, dto.getGuardianApprovalsBiometric());
        assertEquals(1.0, dto.getGuardianApprovalsManual());

        assertTrue(dto.getJvmMemoryMaxMb() > 0);
    }
}
