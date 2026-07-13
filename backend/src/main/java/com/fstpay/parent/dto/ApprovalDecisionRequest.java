package com.fstpay.parent.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ApprovalDecisionRequest {
    @NotNull(message = "Decision (approved) is required")
    private Boolean approved;
    
    private String note;
}
