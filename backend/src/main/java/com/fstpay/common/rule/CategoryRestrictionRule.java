package com.fstpay.common.rule;

import com.fstpay.transaction.dto.SimulateSpendRequest;
import com.fstpay.user.entity.User;
import com.fstpay.wallet.entity.Wallet;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Order(5)
public class CategoryRestrictionRule implements TransactionRule {

    @Override
    public RuleEvaluationResult evaluate(User user, Wallet wallet, SimulateSpendRequest request) {
        if (user.getParentalControlEnabled() == null || !user.getParentalControlEnabled()) {
            return RuleEvaluationResult.builder()
                    .status(RuleStatus.NOT_REQUIRED)
                    .message("Parental controls disabled")
                    .build();
        }

        if (user.getParentalRestrictedCategories() == null || user.getParentalRestrictedCategories().trim().isEmpty()) {
            return RuleEvaluationResult.builder()
                    .status(RuleStatus.NOT_REQUIRED)
                    .message("No restricted categories set")
                    .build();
        }

        log.info("Evaluating CategoryRestrictionRule for user: {}", user.getEmail());
        String reqCategory = request.getCategory().toUpperCase().trim();
        String[] restrictedList = user.getParentalRestrictedCategories().split(",");
        for (String restricted : restrictedList) {
            if (restricted.trim().equalsIgnoreCase(reqCategory)) {
                return RuleEvaluationResult.builder()
                        .status(RuleStatus.REJECTED)
                        .message("Blocked by parental control: Access restricted to category " + reqCategory)
                        .build();
            }
        }

        return RuleEvaluationResult.builder()
                .status(RuleStatus.APPROVED)
                .message("Category restriction check passed")
                .build();
    }
}
