package com.fstpay.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChildSummaryDto {
    private UUID id;
    private String fullName;
    private String email;
    private Boolean isActive;
    private Boolean parentalControlEnabled;
    private BigDecimal parentalMaxTxnAmount;
    private String parentalRestrictedCategories;
    private Instant createdAt;
}
