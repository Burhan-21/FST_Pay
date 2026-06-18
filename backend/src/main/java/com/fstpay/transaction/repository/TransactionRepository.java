package com.fstpay.transaction.repository;

import com.fstpay.transaction.entity.Transaction;
import com.fstpay.wallet.entity.Wallet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    Page<Transaction> findByWallet(Wallet wallet, Pageable pageable);
    Page<Transaction> findByWalletId(UUID walletId, Pageable pageable);
    List<Transaction> findTop5ByWalletOrderByCreatedAtDesc(Wallet wallet);

    @Query("SELECT t FROM Transaction t WHERE t.wallet.id = :walletId " +
           "AND (:category IS NULL OR t.category = :category) " +
           "AND (:type IS NULL OR t.type = :type)")
    Page<Transaction> findFiltered(
            @Param("walletId") UUID walletId,
            @Param("category") String category,
            @Param("type") String type,
            Pageable pageable
    );

    List<Transaction> findByWalletIdAndCreatedAtBetween(UUID walletId, Instant start, Instant end);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t")
    java.math.BigDecimal sumAllAmounts();
}
