package com.fstpay.wallet.api;

import com.fstpay.wallet.entity.Wallet;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public interface WalletDailySummaryOperations {
    void trackSpend(Wallet wallet, BigDecimal amount);
    void trackReceive(Wallet wallet, BigDecimal amount);
    void trackSent(Wallet wallet, BigDecimal amount);
    BigDecimal getSpentAmountBetween(UUID walletId, LocalDate startDate, LocalDate endDate);
}
