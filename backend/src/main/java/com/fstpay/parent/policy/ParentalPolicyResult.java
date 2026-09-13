package com.fstpay.parent.policy;

import com.fstpay.parent.entity.TransactionApproval;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ParentalPolicyResult {

    public enum PolicyStatus {
        ALLOWED,
        REQUIRES_APPROVAL,
        REJECTED
    }

    private final PolicyStatus status;
    private final String reason;
    private final TransactionApproval approval;

    public boolean isAllowed() {
        return status == PolicyStatus.ALLOWED;
    }

    public boolean isRequiresApproval() {
        return status == PolicyStatus.REQUIRES_APPROVAL;
    }

    public boolean isRejected() {
        return status == PolicyStatus.REJECTED;
    }

    public static ParentalPolicyResult allowed(String reason) {
        return ParentalPolicyResult.builder()
                .status(PolicyStatus.ALLOWED)
                .reason(reason)
                .build();
    }

    public static ParentalPolicyResult requiresApproval(TransactionApproval approval, String reason) {
        return ParentalPolicyResult.builder()
                .status(PolicyStatus.REQUIRES_APPROVAL)
                .approval(approval)
                .reason(reason)
                .build();
    }

    public static ParentalPolicyResult rejected(String reason) {
        return ParentalPolicyResult.builder()
                .status(PolicyStatus.REJECTED)
                .reason(reason)
                .build();
    }
}
