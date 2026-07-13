package com.fstpay.common.rule;

import com.fstpay.parent.entity.TransactionApproval;
import com.fstpay.parent.repository.TransactionApprovalRepository;
import com.fstpay.transaction.dto.SimulateSpendRequest;
import com.fstpay.user.entity.User;
import com.fstpay.wallet.entity.Wallet;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Order(0) // Executes BEFORE limit rules
@Slf4j
@Component
@RequiredArgsConstructor
public class ApprovalRule implements TransactionRule {

    private final TransactionApprovalRepository approvalRepository;

    @Override
    public RuleEvaluationResult evaluate(User user, Wallet wallet, SimulateSpendRequest request) {
        log.info("Evaluating ApprovalRule for child: {}", user.getEmail());
        
        List<TransactionApproval> approvals = approvalRepository
                .findByChildIdAndStatusOrderByCreatedAtDesc(user.getId(), "APPROVED");

        Optional<TransactionApproval> matchOpt = approvals.stream()
                .filter(a -> a.getAmount() != null && request.getAmount().compareTo(a.getAmount()) <= 0)
                .filter(a -> a.getCategory() == null || a.getCategory().equalsIgnoreCase(request.getCategory()))
                .findFirst();

        if (matchOpt.isPresent()) {
            TransactionApproval approval = matchOpt.get();
            approval.setStatus("COMPLETED");
            approval.setDecidedAt(Instant.now());
            approvalRepository.save(approval);

            log.info("Bypassing parental controls: Matches active parent approval ID: {}", approval.getId());
            return RuleEvaluationResult.builder()
                    .status(RuleStatus.APPROVED)
                    .message("Bypassed parental control: Approved by parent. ID: " + approval.getId())
                    .build();
        }

        return RuleEvaluationResult.builder()
                .status(RuleStatus.NOT_REQUIRED)
                .message("No active parent approval matches this request")
                .build();
    }
}
