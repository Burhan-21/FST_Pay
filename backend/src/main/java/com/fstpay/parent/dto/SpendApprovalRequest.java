package com.fstpay.parent.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class SpendApprovalRequest {
    @NotBlank(message = "Request type is required")
    private String requestType; // SPEND, CARD_FREEZE, CARD_UNFREEZE, CARD_GENERATE, GOAL_WITHDRAW, TRANSFER

    private BigDecimal amount;
    private String category;
    private String merchant;
    private String description;
    private String targetId;
}
