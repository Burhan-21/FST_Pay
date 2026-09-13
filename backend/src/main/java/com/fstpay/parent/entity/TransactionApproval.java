package com.fstpay.parent.entity;

import com.fstpay.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "transaction_approvals")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionApproval {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "parent_id")
    private User parent;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "child_id", nullable = false)
    private User child;

    @Column(name = "request_type", nullable = false, length = 30)
    private String requestType; // SPEND, CARD_FREEZE, CARD_UNFREEZE, CARD_GENERATE, GOAL_WITHDRAW, TRANSFER

    @Column(precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(length = 50)
    private String category;

    @Column(length = 255)
    private String merchant;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "target_id", length = 100)
    private String targetId; // For specific resource interactions

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    @Column(name = "parent_note", columnDefinition = "TEXT")
    private String parentNote;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "biometric_verified")
    @Builder.Default
    private Boolean biometricVerified = false;

    @Column(name = "biometric_auth_method", length = 50)
    private String biometricAuthMethod;

    @Column(name = "biometric_credential_id", length = 255)
    private String biometricCredentialId;

    @Column(name = "biometric_verified_at")
    private Instant biometricVerifiedAt;
}
