package com.fstpay.common.event;

import java.math.BigDecimal;
import java.util.UUID;

public record MerchantSettlementEvent(
    EventMetadata metadata,
    UUID transactionId,
    String referenceId,
    String merchantId,
    BigDecimal settlementAmount,
    String status,
    UUID walletId,
    UUID userId
) implements DomainEvent {

    public static MerchantSettlementEvent create(
            UUID transactionId,
            String referenceId,
            String merchantId,
            BigDecimal settlementAmount,
            String status,
            UUID walletId,
            UUID userId
    ) {
        return new MerchantSettlementEvent(
            EventMetadata.create("MerchantSettlementEvent", transactionId.toString()),
            transactionId,
            referenceId,
            merchantId,
            settlementAmount,
            status,
            walletId,
            userId
        );
    }

    @Override
    public String aggregateType() {
        return "Transaction";
    }

    @Override
    public String aggregateId() {
        return transactionId != null ? transactionId.toString() : referenceId;
    }
}
