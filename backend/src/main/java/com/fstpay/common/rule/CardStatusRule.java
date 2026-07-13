package com.fstpay.common.rule;

import com.fstpay.card.entity.VirtualCard;
import com.fstpay.card.repository.VirtualCardRepository;
import com.fstpay.transaction.dto.SimulateSpendRequest;
import com.fstpay.user.entity.User;
import com.fstpay.wallet.entity.Wallet;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class CardStatusRule implements TransactionRule {

    private final VirtualCardRepository virtualCardRepository;

    @Override
    public RuleEvaluationResult evaluate(User user, Wallet wallet, SimulateSpendRequest request) {
        if (request.getCardId() == null) {
            return RuleEvaluationResult.builder()
                    .status(RuleStatus.NOT_REQUIRED)
                    .message("No card involved")
                    .build();
        }

        log.info("Evaluating CardStatusRule for card: {}", request.getCardId());
        java.util.Optional<VirtualCard> cardOpt = virtualCardRepository.findByIdAndUser(request.getCardId(), user);
        if (cardOpt.isEmpty()) {
            return RuleEvaluationResult.builder()
                    .status(RuleStatus.REJECTED)
                    .message("Virtual card not found for this user")
                    .build();
        }

        VirtualCard card = cardOpt.get();
        if (!"ACTIVE".equalsIgnoreCase(card.getStatus())) {
            return RuleEvaluationResult.builder()
                    .status(RuleStatus.REJECTED)
                    .message("Blocked: Virtual card is " + card.getStatus().toLowerCase())
                    .build();
        }

        if (card.getSpendingLimit() != null && request.getAmount().compareTo(card.getSpendingLimit()) > 0) {
            return RuleEvaluationResult.builder()
                    .status(RuleStatus.REJECTED)
                    .message("Blocked: Amount exceeds card single-transaction spending limit of ₹" + card.getSpendingLimit())
                    .build();
        }

        return RuleEvaluationResult.builder()
                .status(RuleStatus.APPROVED)
                .message("Card checks passed")
                .build();
    }
}
