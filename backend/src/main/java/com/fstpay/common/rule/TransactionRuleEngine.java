package com.fstpay.common.rule;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.transaction.dto.SimulateSpendRequest;
import com.fstpay.user.entity.User;
import com.fstpay.wallet.entity.Wallet;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransactionRuleEngine {

    private final List<TransactionRule> rules;

    public RuleEvaluationResult process(User user, Wallet wallet, SimulateSpendRequest request) {
        log.info("Processing transaction rule evaluation chain for user: {}", user.getEmail());

        // 1. Run ApprovalRule first
        boolean hasBypassApproval = false;
        for (TransactionRule rule : rules) {
            if (rule instanceof ApprovalRule) {
                RuleEvaluationResult result = rule.evaluate(user, wallet, request);
                if (result.getStatus() == RuleStatus.APPROVED) {
                    hasBypassApproval = true;
                    log.info("Rule Engine: Approval bypass matched. Skipping spending limit and category restriction rules.");
                }
            }
        }

        // 2. Evaluate remaining rules
        for (TransactionRule rule : rules) {
            // If we have an approval bypass, skip spending limit and category checks
            if (hasBypassApproval && (rule instanceof SpendingLimitRule || rule instanceof CategoryRestrictionRule)) {
                continue;
            }

            // We already ran ApprovalRule
            if (rule instanceof ApprovalRule) {
                continue;
            }

            RuleEvaluationResult result = rule.evaluate(user, wallet, request);
            if (result.getStatus() == RuleStatus.REJECTED) {
                log.warn("Rule Engine block: {}", result.getMessage());
                throw new BadRequestException(result.getMessage());
            }
            if (result.getStatus() == RuleStatus.PENDING) {
                log.warn("Rule Engine pending parent approval: {}", result.getMessage());
                throw new BadRequestException(result.getMessage());
            }
        }

        log.info("Rule Engine: All transaction validation checks passed successfully.");
        return RuleEvaluationResult.builder()
                .status(RuleStatus.APPROVED)
                .message("All checks passed")
                .build();
    }
}
