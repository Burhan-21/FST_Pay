package com.fstpay.reward.service;

import com.fstpay.common.event.EventPublisher;
import com.fstpay.common.event.RewardRedeemedEvent;
import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.goal.repository.WalletGoalRepository;
import com.fstpay.reward.dto.BadgeResponse;
import com.fstpay.reward.dto.RedeemResponse;
import com.fstpay.reward.dto.RewardsStatusResponse;
import com.fstpay.reward.entity.*;
import com.fstpay.reward.repository.*;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class RewardsService {

    private final RewardPointsRepository rewardPointsRepository;
    private final RewardHistoryRepository rewardHistoryRepository;
    private final UserRepository userRepository;
    private final BadgeRepository badgeRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final RewardItemRepository rewardItemRepository;
    private final RewardRedemptionRepository rewardRedemptionRepository;
    private final WalletGoalRepository walletGoalRepository;
    private final EventPublisher eventPublisher;

    public RewardsService(
            RewardPointsRepository rewardPointsRepository,
            RewardHistoryRepository rewardHistoryRepository,
            UserRepository userRepository,
            BadgeRepository badgeRepository,
            UserBadgeRepository userBadgeRepository,
            RewardItemRepository rewardItemRepository,
            RewardRedemptionRepository rewardRedemptionRepository,
            @Lazy WalletGoalRepository walletGoalRepository,
            EventPublisher eventPublisher
    ) {
        this.rewardPointsRepository = rewardPointsRepository;
        this.rewardHistoryRepository = rewardHistoryRepository;
        this.userRepository = userRepository;
        this.badgeRepository = badgeRepository;
        this.userBadgeRepository = userBadgeRepository;
        this.rewardItemRepository = rewardItemRepository;
        this.rewardRedemptionRepository = rewardRedemptionRepository;
        this.walletGoalRepository = walletGoalRepository;
        this.eventPublisher = eventPublisher;
    }

    public RewardPoints getRewardPoints(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return rewardPointsRepository.findByUser(user)
                .orElseGet(() -> createDefaultRewards(user));
    }

    public RewardsStatusResponse getRewardsStatus(String email) {
        RewardPoints points = getRewardPoints(email);
        int currentLevel = points.getLevel();
        int currentBoundary = (int) Math.pow(currentLevel - 1, 2) * 100;
        int nextBoundary = (int) Math.pow(currentLevel, 2) * 100;

        return RewardsStatusResponse.builder()
                .points(points.getPoints())
                .xp(points.getXp())
                .level(currentLevel)
                .currentLevelXpBoundary(currentBoundary)
                .nextLevelXpBoundary(nextBoundary)
                .streakDays(points.getStreakDays())
                .lastStreakAt(points.getLastStreakAt())
                .build();
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
                points.setStreakDays(1);
            } else {
                points.setStreakDays(points.getStreakDays() + 1);
            }
        } else {
            points.setStreakDays(1);
        }

        int pointsAmount = 10 + Math.min(points.getStreakDays(), 10) * 5;
        int xpAmount = 25 + Math.min(points.getStreakDays(), 10) * 5; // gain XP as well!

        points.setPoints(points.getPoints() + pointsAmount);
        points.setLastStreakAt(now);
        rewardPointsRepository.save(points);

        // Record Points History
        RewardHistory history = RewardHistory.builder()
                .user(user)
                .pointsChange(pointsAmount)
                .reason("Daily streak claim (Day " + points.getStreakDays() + ")")
                .build();
        rewardHistoryRepository.save(history);

        // Add XP which evaluates levels & badges
        addXpInternal(user, points, xpAmount, "Daily streak claim");

        return points;
    }

    @Transactional
    public void addPoints(User user, int pointsAmount, String reason) {
        RewardPoints points = rewardPointsRepository.findByUser(user)
                .orElseGet(() -> createDefaultRewards(user));
        points.setPoints(points.getPoints() + pointsAmount);
        rewardPointsRepository.save(points);

        RewardHistory history = RewardHistory.builder()
                .user(user)
                .pointsChange(pointsAmount)
                .reason(reason)
                .build();
        rewardHistoryRepository.save(history);
    }

    @Transactional
    public void addXp(User user, int xpAmount, String reason) {
        RewardPoints points = rewardPointsRepository.findByUser(user)
                .orElseGet(() -> createDefaultRewards(user));
        addXpInternal(user, points, xpAmount, reason);
    }

    private void addXpInternal(User user, RewardPoints points, int xpAmount, String reason) {
        int oldLevel = points.getLevel();
        points.setXp(points.getXp() + xpAmount);

        // Level = 1 + floor(sqrt(xp / 100))
        int newLevel = 1 + (int) Math.floor(Math.sqrt((double) points.getXp() / 100.0));
        if (newLevel > oldLevel) {
            points.setLevel(newLevel);
            // Grant level-up bonus points!
            int levelUpPoints = newLevel * 50;
            points.setPoints(points.getPoints() + levelUpPoints);
            log.info("User {} leveled up! {} -> {}. Gained {} points.", user.getEmail(), oldLevel, newLevel, levelUpPoints);

            RewardHistory levelUpHistory = RewardHistory.builder()
                    .user(user)
                    .pointsChange(levelUpPoints)
                    .reason("Level Up Bonus! Reached Level " + newLevel)
                    .build();
            rewardHistoryRepository.save(levelUpHistory);
        }

        rewardPointsRepository.save(points);

        // Run badge check
        checkAndUnlockBadges(user, points);
    }

    @Transactional
    public void checkAndUnlockBadges(User user, RewardPoints points) {
        List<Badge> allBadges = badgeRepository.findAll();
        List<UserBadge> unlocked = userBadgeRepository.findByUser(user);
        List<UUID> unlockedBadgeIds = unlocked.stream()
                .map(ub -> ub.getBadge().getId())
                .collect(Collectors.toList());

        for (Badge badge : allBadges) {
            if (unlockedBadgeIds.contains(badge.getId())) {
                continue;
            }

            boolean requirementMet = false;
            switch (badge.getRequirementType()) {
                case "GOALS_COMPLETED":
                    long completedGoals = walletGoalRepository.countByUserAndStatus(user, "COMPLETED");
                    if (completedGoals >= badge.getRequirementValue()) {
                        requirementMet = true;
                    }
                    break;
                case "STREAK_DAYS":
                    if (points.getStreakDays() >= badge.getRequirementValue()) {
                        requirementMet = true;
                    }
                    break;
                case "HEALTH_SCORE":
                    // Use a threshold or simple check. Default to true if user has level/XP checks
                    // Or let controller trigger check when score changes.
                    // For now, check if user's level is high enough as a proxy or if we can grant.
                    // Let's grant if user has at least level 3 or has positive checking.
                    if (points.getLevel() >= 3) {
                        requirementMet = true;
                    }
                    break;
            }

            if (requirementMet) {
                UserBadge userBadge = UserBadge.builder()
                        .user(user)
                        .badge(badge)
                        .unlockedAt(Instant.now())
                        .build();
                userBadgeRepository.save(userBadge);
                log.info("Badge unlocked for user {}: {}", user.getEmail(), badge.getDisplayName());

                // Reward points for unlocking a badge!
                addPoints(user, 150, "Unlocked Badge: " + badge.getDisplayName());
            }
        }
    }

    public List<BadgeResponse> getUserBadges(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<Badge> allBadges = badgeRepository.findAll();
        List<UserBadge> unlocked = userBadgeRepository.findByUser(user);

        List<BadgeResponse> responses = new ArrayList<>();
        for (Badge badge : allBadges) {
            Optional<UserBadge> ubOpt = unlocked.stream()
                    .filter(ub -> ub.getBadge().getId().equals(badge.getId()))
                    .findFirst();

            responses.add(BadgeResponse.builder()
                    .id(badge.getId())
                    .name(badge.getName())
                    .displayName(badge.getDisplayName())
                    .description(badge.getDescription())
                    .icon(badge.getIcon())
                    .unlocked(ubOpt.isPresent())
                    .unlockedAt(ubOpt.map(UserBadge::getUnlockedAt).orElse(null))
                    .build());
        }
        return responses;
    }

    public List<RewardItem> getRewardCatalog() {
        return rewardItemRepository.findAll();
    }

    @Transactional
    public RedeemResponse redeemItem(String email, UUID itemId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        RewardItem item = rewardItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Reward item not found"));
        RewardPoints points = rewardPointsRepository.findByUser(user)
                .orElseGet(() -> createDefaultRewards(user));

        if (item.getStock() <= 0) {
            throw new BadRequestException("Reward item is currently out of stock.");
        }
        if (points.getPoints() < item.getCostPoints()) {
            throw new BadRequestException("Insufficient points to redeem this item. Required: " 
                    + item.getCostPoints() + ", Available: " + points.getPoints());
        }

        // Deduct points
        points.setPoints(points.getPoints() - item.getCostPoints());
        rewardPointsRepository.save(points);

        // Record history of point usage
        RewardHistory history = RewardHistory.builder()
                .user(user)
                .pointsChange(-item.getCostPoints())
                .reason("Redeemed Reward Item: " + item.getTitle())
                .build();
        rewardHistoryRepository.save(history);

        // Decrement stock
        item.setStock(item.getStock() - 1);
        rewardItemRepository.save(item);

        // Create redemption record
        // In real system, we'd draw from a pool of unique voucher codes, here we generate one using code pattern
        String claimCode = item.getCode() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        RewardRedemption redemption = RewardRedemption.builder()
                .user(user)
                .item(item)
                .codeClaimed(claimCode)
                .redeemedAt(Instant.now())
                .build();
        rewardRedemptionRepository.save(redemption);

        eventPublisher.publish(RewardRedeemedEvent.create(
                user,
                redemption.getId(),
                item.getTitle(),
                item.getCostPoints()
        ));

        log.info("User {} redeemed item {}. Points spent: {}", email, item.getTitle(), item.getCostPoints());

        return RedeemResponse.builder()
                .id(redemption.getId())
                .title(item.getTitle())
                .description(item.getDescription())
                .codeClaimed(claimCode)
                .redeemedAt(redemption.getRedeemedAt())
                .build();
    }

    public List<RedeemResponse> getRedemptionHistory(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<RewardRedemption> redemptions = rewardRedemptionRepository.findByUserOrderByRedeemedAtDesc(user);
        return redemptions.stream()
                .map(r -> RedeemResponse.builder()
                        .id(r.getId())
                        .title(r.getItem().getTitle())
                        .description(r.getItem().getDescription())
                        .codeClaimed(r.getCodeClaimed())
                        .redeemedAt(r.getRedeemedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private RewardPoints createDefaultRewards(User user) {
        RewardPoints points = RewardPoints.builder()
                .user(user)
                .points(100)
                .xp(50)
                .level(1)
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
