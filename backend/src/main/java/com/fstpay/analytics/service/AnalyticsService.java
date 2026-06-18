package com.fstpay.analytics.service;

import com.fstpay.analytics.dto.AnalyticsResponse;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;
    private final UserRepository userRepository;

    public AnalyticsResponse getAnalytics(String email, int days) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Wallet wallet = walletRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));

        Instant start = Instant.now().minus(days, ChronoUnit.DAYS);
        Instant end = Instant.now();

        List<Transaction> txns = transactionRepository.findByWalletIdAndCreatedAtBetween(wallet.getId(), start, end);

        BigDecimal totalCredit = BigDecimal.ZERO;
        BigDecimal totalDebit = BigDecimal.ZERO;
        Map<String, BigDecimal> spendByCategory = new HashMap<>();

        for (Transaction txn : txns) {
            if ("CREDIT".equalsIgnoreCase(txn.getType())) {
                totalCredit = totalCredit.add(txn.getAmount());
            } else if ("DEBIT".equalsIgnoreCase(txn.getType())) {
                totalDebit = totalDebit.add(txn.getAmount());
                String category = txn.getCategory() != null ? txn.getCategory().toUpperCase() : "OTHER";
                spendByCategory.put(category, spendByCategory.getOrDefault(category, BigDecimal.ZERO).add(txn.getAmount()));
            }
        }

        BigDecimal netSavings = totalCredit.subtract(totalDebit);
        BigDecimal daysBigDecimal = BigDecimal.valueOf(days > 0 ? days : 1);
        BigDecimal dailyAverageSpend = totalDebit.divide(daysBigDecimal, 2, RoundingMode.HALF_UP);

        return AnalyticsResponse.builder()
                .totalCredit(totalCredit)
                .totalDebit(totalDebit)
                .netSavings(netSavings)
                .dailyAverageSpend(dailyAverageSpend)
                .spendByCategory(spendByCategory)
                .build();
    }
}
