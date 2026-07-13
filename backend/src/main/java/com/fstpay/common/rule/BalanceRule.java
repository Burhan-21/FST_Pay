package com.fstpay.common.rule;

import com.fstpay.transaction.dto.SimulateSpendRequest;
import com.fstpay.user.entity.User;
import com.fstpay.wallet.entity.Wallet;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Order(1)
public class BalanceRule implements TransactionRule {

    @Override
    public RuleEvaluationResult evaluate(User user, Wallet wallet, SimulateSpendRequest request) {
        log.info("Evaluating BalanceRule for wallet: {}", wallet.getId());
        if (wallet.getIsActive() == null || !wallet.getIsActive()) {
            return RuleEvaluationResult.builder()
                    .status(RuleStatus.REJECTED)
                    .message("Wallet is inactive")
                    .build();
        }
        if (wallet.getBalance().compareTo(request.getAmount()) < 0) {
            return RuleEvaluationResult.builder()
                    .status(RuleStatus.REJECTED)
                    .message("Insufficient wallet balance")
                    .build();
        }
        return RuleEvaluationResult.builder()
                .status(RuleStatus.NOT_REQUIRED)
                .message("Balance checks passed")
                .build();
    }
}
