package com.fstpay.card.entity;

import com.fstpay.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "virtual_cards")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VirtualCard {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User user;

    @Column(name = "card_number", nullable = false, length = 64)
    private String cardNumber;

    @Column(name = "card_holder", nullable = false, length = 100)
    private String cardHolder;

    @Column(name = "expiry_month", nullable = false)
    private Integer expiryMonth;

    @Column(name = "expiry_year", nullable = false)
    private Integer expiryYear;

    @Column(name = "cvv_hash", nullable = false, length = 255)
    private String cvvHash;

    @Column(name = "card_type", nullable = false, length = 20)
    @Builder.Default
    private String cardType = "PREPAID";

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, FROZEN, EXPIRED

    @Column(name = "spending_limit", precision = 15, scale = 2)
    private BigDecimal spendingLimit;

    @Column(name = "daily_limit", precision = 15, scale = 2)
    private BigDecimal dailyLimit;

    @Column(name = "is_one_time", nullable = false)
    @Builder.Default
    private Boolean isOneTime = false;

    // Use element collection or convert to/from array
    // Since PostgreSQL has text[] type, mapping it as native element collection or just comma separated is easiest.
    // Let's use simple comma separated list internally or JSON for database portability, but element collection is standard.
    // Or we can just use element collection:
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "virtual_card_merchant_locks", joinColumns = @JoinColumn(name = "card_id"))
    @Column(name = "merchant_mcc")
    private java.util.List<String> merchantLock;

    @Column(name = "card_design", length = 500)
    private String cardDesign;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
