package com.fstpay.wallet.application;

import com.fstpay.wallet.api.WalletDailySummaryOperations;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.entity.WalletDailySummary;
import com.fstpay.wallet.repository.WalletDailySummaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WalletDailySummaryService implements WalletDailySummaryOperations {

    private final WalletDailySummaryRepository summaryRepository;

    @Transactional
    public void trackSpend(Wallet wallet, BigDecimal amount) {
        LocalDate today = LocalDate.now();
        WalletDailySummary summary = getOrCreateSummary(wallet, today);
        summary.setTotalSpent(summary.getTotalSpent().add(amount));
        summary.setExpense(summary.getExpense().add(amount));
        summary.setTransactionCount(summary.getTransactionCount() + 1);
        summaryRepository.save(summary);
        log.info("Tracked spend: {} in wallet: {} for date: {}", amount, wallet.getId(), today);
    }

    @Transactional
    public void trackReceive(Wallet wallet, BigDecimal amount) {
        LocalDate today = LocalDate.now();
        WalletDailySummary summary = getOrCreateSummary(wallet, today);
        summary.setTotalReceived(summary.getTotalReceived().add(amount));
        summary.setIncome(summary.getIncome().add(amount));
        summary.setTransactionCount(summary.getTransactionCount() + 1);
        summaryRepository.save(summary);
        log.info("Tracked receive: {} in wallet: {} for date: {}", amount, wallet.getId(), today);
    }

    @Transactional
    public void trackSent(Wallet wallet, BigDecimal amount) {
        LocalDate today = LocalDate.now();
        WalletDailySummary summary = getOrCreateSummary(wallet, today);
        summary.setTotalSent(summary.getTotalSent().add(amount));
        summary.setExpense(summary.getExpense().add(amount));
        summary.setTransactionCount(summary.getTransactionCount() + 1);
        summaryRepository.save(summary);
        log.info("Tracked sent: {} in wallet: {} for date: {}", amount, wallet.getId(), today);
    }

    public BigDecimal getSpentAmountBetween(UUID walletId, LocalDate startDate, LocalDate endDate) {
        List<WalletDailySummary> summaries = summaryRepository.findByWalletIdAndDateBetween(walletId, startDate, endDate);
        return summaries.stream()
                .map(WalletDailySummary::getTotalSpent)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private WalletDailySummary getOrCreateSummary(Wallet wallet, LocalDate date) {
        return summaryRepository.findByWalletIdAndSummaryDate(wallet.getId(), date)
                .orElseGet(() -> WalletDailySummary.builder()
                        .wallet(wallet)
                        .summaryDate(date)
                        .totalSpent(BigDecimal.ZERO)
                        .totalReceived(BigDecimal.ZERO)
                        .totalSent(BigDecimal.ZERO)
                        .income(BigDecimal.ZERO)
                        .expense(BigDecimal.ZERO)
                        .transactionCount(0)
                        .build());
    }
}
