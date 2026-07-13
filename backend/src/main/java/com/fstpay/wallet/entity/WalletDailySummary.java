package com.fstpay.wallet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "wallet_daily_summaries", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"wallet_id", "summary_date"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletDailySummary {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    @Column(name = "summary_date", nullable = false)
    private LocalDate summaryDate;

    @Column(name = "total_spent", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalSpent = BigDecimal.ZERO;

    @Column(name = "total_received", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalReceived = BigDecimal.ZERO;

    @Column(name = "total_sent", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalSent = BigDecimal.ZERO;

    @Column(name = "transaction_count", nullable = false)
    @Builder.Default
    private Integer transactionCount = 0;

    @Column(name = "income", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal income = BigDecimal.ZERO;

    @Column(name = "expense", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal expense = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
