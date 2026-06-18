package com.fstpay.reward.service;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.reward.entity.RewardHistory;
import com.fstpay.reward.entity.RewardPoints;
import com.fstpay.reward.repository.RewardHistoryRepository;
import com.fstpay.reward.repository.RewardPointsRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class RewardsService {

    private final RewardPointsRepository rewardPointsRepository;
    private final RewardHistoryRepository rewardHistoryRepository;
    private final UserRepository userRepository;

    public RewardPoints getRewardPoints(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return rewardPointsRepository.findByUser(user)
                .orElseGet(() -> createDefaultRewards(user));
    }

    public Page<RewardHistory> getRewardHistory(String email, int page, int size) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return rewardHistoryRepository.findByUser(user, pageable);
    }

    @Transactional
    public RewardPoints claimDailyStreak(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        RewardPoints points = rewardPointsRepository.findByUser(user)
                .orElseGet(() -> createDefaultRewards(user));

        Instant now = Instant.now();
        if (points.getLastStreakAt() != null) {
            long hoursSinceLastStreak = ChronoUnit.HOURS.between(points.getLastStreakAt(), now);
            if (hoursSinceLastStreak < 20) {
                throw new BadRequestException("Daily streak reward already claimed today. Try again later.");
            }
            if (hoursSinceLastStreak > 48) {
                // Streak broken
                points.setStreakDays(1);
            } else {
                points.setStreakDays(points.getStreakDays() + 1);
            }
        } else {
            points.setStreakDays(1);
        }

        // Calculate points gained
        int rewardAmount = 10 + Math.min(points.getStreakDays(), 10) * 5; // base 10 + streak multiplier max 50
        points.setPoints(points.getPoints() + rewardAmount);
        points.setLastStreakAt(now);
        RewardPoints savedPoints = rewardPointsRepository.save(points);

        // Record History
        RewardHistory history = RewardHistory.builder()
                .user(user)
                .pointsChange(rewardAmount)
                .reason("Daily streak claim (Day " + points.getStreakDays() + ")")
                .build();
        rewardHistoryRepository.save(history);

        return savedPoints;
    }

    private RewardPoints createDefaultRewards(User user) {
        RewardPoints points = RewardPoints.builder()
                .user(user)
                .points(100) // 100 points signup bonus
                .streakDays(0)
                .build();
        RewardPoints saved = rewardPointsRepository.save(points);

        RewardHistory history = RewardHistory.builder()
                .user(user)
                .pointsChange(100)
                .reason("FST Pay Signup Bonus")
                .build();
        rewardHistoryRepository.save(history);

        return saved;
    }
}
