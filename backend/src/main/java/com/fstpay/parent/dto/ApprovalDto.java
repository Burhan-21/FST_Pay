package com.fstpay.parent.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ApprovalDto {
    private UUID id;
    private String requestType; // SPEND, CARD_FREEZE, CARD_UNFREEZE, CARD_GENERATE, GOAL_WITHDRAW, TRANSFER
    private BigDecimal amount;
    private String category;
    private String merchant;
    private String description;
    private String status; // PENDING, APPROVED, REJECTED
    private String parentNote;
    private String targetId;
    private UUID childId;
    private String childName;
    private Instant createdAt;
    private Instant decidedAt;
    private Boolean biometricVerified;
    private String biometricAuthMethod;
    private String biometricCredentialId;
    private Instant biometricVerifiedAt;
}
