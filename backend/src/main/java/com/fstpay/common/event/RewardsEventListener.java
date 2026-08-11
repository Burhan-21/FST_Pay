package com.fstpay.common.event;

import com.fstpay.reward.service.RewardsService;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RewardsEventListener {

    private final RewardsService rewardsService;
    private final UserRepository userRepository;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleMoneyTransferred(MoneyTransferredEvent event) {
        log.info("Handling rewards for MoneyTransferredEvent");

        User child = userRepository.findById(event.child().id()).orElse(null);
        if (child != null) {
            rewardsService.addXp(child, 5, "Received pocket money from parent");
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleGoalCompleted(GoalCompletedEvent event) {
        log.info("Handling rewards for GoalCompletedEvent");

        User user = userRepository.findById(event.user().id()).orElse(null);
        if (user != null) {
            rewardsService.addPoints(user, event.rewardPoints(), "Completed savings goal: " + event.goalName());
        }
    }
}
