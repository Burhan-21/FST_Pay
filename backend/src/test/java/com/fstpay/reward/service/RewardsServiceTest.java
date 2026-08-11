package com.fstpay.reward.service;

import com.fstpay.common.event.EventPublisher;
import com.fstpay.common.event.RewardRedeemedEvent;
import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.goal.repository.WalletGoalRepository;
import com.fstpay.reward.dto.BadgeResponse;
import com.fstpay.reward.dto.RedeemResponse;
import com.fstpay.reward.dto.RewardsStatusResponse;
import com.fstpay.reward.entity.Badge;
import com.fstpay.reward.entity.RewardItem;
import com.fstpay.reward.entity.RewardPoints;
import com.fstpay.reward.entity.UserBadge;
import com.fstpay.reward.repository.*;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RewardsServiceTest {

    @Mock
    private RewardPointsRepository rewardPointsRepository;
    @Mock
    private RewardHistoryRepository rewardHistoryRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BadgeRepository badgeRepository;
    @Mock
    private UserBadgeRepository userBadgeRepository;
    @Mock
    private RewardItemRepository rewardItemRepository;
    @Mock
    private RewardRedemptionRepository rewardRedemptionRepository;
    @Mock
    private WalletGoalRepository walletGoalRepository;
    @Mock
    private EventPublisher eventPublisher;

    private RewardsService rewardsService;

    private User user;
    private RewardPoints rewardPoints;

    @BeforeEach
    void setUp() {
        rewardsService = new RewardsService(
                rewardPointsRepository, rewardHistoryRepository, userRepository,
                badgeRepository, userBadgeRepository, rewardItemRepository,
                rewardRedemptionRepository, walletGoalRepository, eventPublisher
        );

        user = User.builder().id(UUID.randomUUID()).email("test@example.com").fullName("Test Teen").build();
        rewardPoints = RewardPoints.builder()
                .user(user)
                .points(100)
                .xp(50)
                .level(1)
                .streakDays(0)
                .build();
    }

    @Test
    void getRewardsStatus_ReturnsCorrectProgress() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(rewardPointsRepository.findByUser(user)).thenReturn(Optional.of(rewardPoints));

        RewardsStatusResponse result = rewardsService.getRewardsStatus("test@example.com");

        assertNotNull(result);
        assertEquals(100, result.getPoints());
        assertEquals(50, result.getXp());
        assertEquals(1, result.getLevel());
        assertEquals(0, result.getCurrentLevelXpBoundary());
        assertEquals(100, result.getNextLevelXpBoundary());
    }

    @Test
    void claimDailyStreak_IncreasesStreakAndXP() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(rewardPointsRepository.findByUser(user)).thenReturn(Optional.of(rewardPoints));
        when(rewardPointsRepository.save(any(RewardPoints.class))).thenAnswer(i -> i.getArgument(0));

        RewardPoints result = rewardsService.claimDailyStreak("test@example.com");

        assertNotNull(result);
        assertEquals(1, result.getStreakDays());
        assertTrue(result.getPoints() > 100);
        assertTrue(result.getXp() > 50);
    }

    @Test
    void claimDailyStreak_ThrowsExceptionWhenTooEarly() {
        rewardPoints.setLastStreakAt(Instant.now().minus(2, ChronoUnit.HOURS));

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(rewardPointsRepository.findByUser(user)).thenReturn(Optional.of(rewardPoints));

        assertThrows(BadRequestException.class, () -> rewardsService.claimDailyStreak("test@example.com"));
    }

    @Test
    void addXp_TriggersLevelUpAndAwardsBonus() {
        when(rewardPointsRepository.findByUser(user)).thenReturn(Optional.of(rewardPoints));
        when(rewardPointsRepository.save(any(RewardPoints.class))).thenAnswer(i -> i.getArgument(0));

        rewardsService.addXp(user, 100, "Level up test");

        assertEquals(2, rewardPoints.getLevel());
        assertTrue(rewardPoints.getPoints() > 100); // gets Level Up bonus points
    }

    @Test
    void redeemItem_WithSufficientPoints_RedeemsVoucher() {
        UUID itemId = UUID.randomUUID();
        RewardItem item = RewardItem.builder()
                .id(itemId)
                .title("₹50 Voucher")
                .costPoints(50)
                .stock(5)
                .code("CODE50")
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(rewardItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(rewardPointsRepository.findByUser(user)).thenReturn(Optional.of(rewardPoints));
        when(rewardPointsRepository.save(any(RewardPoints.class))).thenAnswer(i -> i.getArgument(0));

        RedeemResponse result = rewardsService.redeemItem("test@example.com", itemId);

        assertNotNull(result);
        assertEquals("₹50 Voucher", result.getTitle());
        assertTrue(result.getCodeClaimed().startsWith("CODE50-"));
        assertEquals(50, rewardPoints.getPoints());
        assertEquals(4, item.getStock());
        verify(eventPublisher, times(1)).publish(any(RewardRedeemedEvent.class));
    }

    @Test
    void redeemItem_WithInsufficientPoints_ThrowsException() {
        UUID itemId = UUID.randomUUID();
        RewardItem item = RewardItem.builder()
                .id(itemId)
                .title("₹200 Voucher")
                .costPoints(200)
                .stock(5)
                .code("CODE200")
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(rewardItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(rewardPointsRepository.findByUser(user)).thenReturn(Optional.of(rewardPoints));

        assertThrows(BadRequestException.class, () -> rewardsService.redeemItem("test@example.com", itemId));
    }
}
