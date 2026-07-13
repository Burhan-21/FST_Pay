package com.fstpay.wallet.repository;

import com.fstpay.wallet.entity.WalletDailySummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WalletDailySummaryRepository extends JpaRepository<WalletDailySummary, UUID> {
    Optional<WalletDailySummary> findByWalletIdAndSummaryDate(UUID walletId, LocalDate summaryDate);

    @Query("SELECT s FROM WalletDailySummary s WHERE s.wallet.id = :walletId AND s.summaryDate BETWEEN :startDate AND :endDate")
    List<WalletDailySummary> findByWalletIdAndDateBetween(
            @Param("walletId") UUID walletId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
}
