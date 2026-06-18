package com.fstpay.transaction.entity;

import com.fstpay.wallet.entity.Wallet;
import com.fstpay.card.entity.VirtualCard;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "transactions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Wallet wallet;

    // Optional field, can be null if it's a direct wallet top-up / bank transfer
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private VirtualCard card;

    @Column(nullable = false, length = 20)
    private String type; // CREDIT, DEBIT

    @Column(length = 50)
    private String category; // FOOD, TRANSPORT, SHOPPING, etc.

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "balance_after", nullable = false, precision = 15, scale = 2)
    private BigDecimal balanceAfter;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 255)
    private String merchant;

    @Column(name = "reference_id", unique = true, length = 100)
    private String referenceId;

    @Column(length = 20)
    @Builder.Default
    private String status = "COMPLETED";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
