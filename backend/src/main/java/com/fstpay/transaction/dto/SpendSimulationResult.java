package com.fstpay.transaction.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fstpay.parent.dto.ApprovalDto;
import com.fstpay.parent.entity.TransactionApproval;
import com.fstpay.transaction.entity.Transaction;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SpendSimulationResult {

    private final String status; // "COMPLETED" or "PENDING_APPROVAL"
    private final String message;
    private final Transaction transaction;
    private final ApprovalDto approval;
    private final java.math.BigDecimal roundUpAmount;
    private final java.util.UUID roundUpGoalId;
    private final String roundUpGoalName;

    public boolean isCompleted() {
        return "COMPLETED".equalsIgnoreCase(status);
    }

    public boolean isRequiresApproval() {
        return "PENDING_APPROVAL".equalsIgnoreCase(status);
    }

    public static SpendSimulationResult completed(Transaction transaction, String message) {
        return SpendSimulationResult.builder()
                .status("COMPLETED")
                .message(message)
                .transaction(transaction)
                .build();
    }

    public static SpendSimulationResult completed(Transaction transaction, String message, java.math.BigDecimal roundUpAmount, java.util.UUID roundUpGoalId, String roundUpGoalName) {
        return SpendSimulationResult.builder()
                .status("COMPLETED")
                .message(message)
                .transaction(transaction)
                .roundUpAmount(roundUpAmount)
                .roundUpGoalId(roundUpGoalId)
                .roundUpGoalName(roundUpGoalName)
                .build();
    }

    public static SpendSimulationResult pendingApproval(TransactionApproval approval, String message) {
        ApprovalDto dto = ApprovalDto.builder()
                .id(approval.getId())
                .requestType(approval.getRequestType())
                .amount(approval.getAmount())
                .category(approval.getCategory())
                .merchant(approval.getMerchant())
                .description(approval.getDescription())
                .status(approval.getStatus())
                .parentNote(approval.getParentNote())
                .targetId(approval.getTargetId())
                .childId(approval.getChild() != null ? approval.getChild().getId() : null)
                .childName(approval.getChild() != null ? approval.getChild().getFullName() : null)
                .createdAt(approval.getCreatedAt())
                .decidedAt(approval.getDecidedAt())
                .build();

        return SpendSimulationResult.builder()
                .status("PENDING_APPROVAL")
                .message(message)
                .approval(dto)
                .build();
    }
}
