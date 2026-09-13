package com.fstpay.aicoach.service;

import com.fstpay.aicoach.dto.AiBudgetAnomalyDto;
import com.fstpay.aicoach.provider.FallbackProvider;
import com.fstpay.aicoach.provider.GeminiProvider;
import com.fstpay.aicoach.provider.OpenAiProvider;
import com.fstpay.aicoach.repository.AiSessionRepository;
import com.fstpay.analytics.dto.AnalyticsResponse;
import com.fstpay.analytics.service.AnalyticsService;
import com.fstpay.common.event.AiBudgetAnomalyEvent;
import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.goal.repository.WalletGoalRepository;
import com.fstpay.notification.enums.NotificationType;
import com.fstpay.notification.service.NotificationService;
import com.fstpay.reward.repository.RewardPointsRepository;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiCoachAnomalyDetectionTest {

    @Mock
    private AiSessionRepository aiSessionRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AnalyticsService analyticsService;
    @Mock
    private WalletRepository walletRepository;
    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private WalletGoalRepository walletGoalRepository;
    @Mock
    private RewardPointsRepository rewardPointsRepository;
    @Mock
    private GeminiProvider geminiProvider;
    @Mock
    private OpenAiProvider openAiProvider;
    @Mock
    private FallbackProvider fallbackProvider;
    @Mock
    private io.micrometer.core.instrument.MeterRegistry meterRegistry;
    @Mock
    private NotificationService notificationService;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    private AiCoachService aiCoachService;
    private User user;
    private Wallet wallet;

    @BeforeEach
    void setUp() {
        aiCoachService = new AiCoachService(
                aiSessionRepository, userRepository, analyticsService, walletRepository,
                transactionRepository, walletGoalRepository, rewardPointsRepository,
                geminiProvider, openAiProvider, fallbackProvider, new ArrayList<>(),
                meterRegistry, notificationService, eventPublisher
        );

        user = User.builder().id(UUID.randomUUID()).email("teen@example.com").fullName("Teen User").build();
        wallet = Wallet.builder().id(UUID.randomUUID()).user(user).balance(new BigDecimal("1500.00")).build();

        when(userRepository.findByEmail("teen@example.com")).thenReturn(Optional.of(user));
        when(walletRepository.findByUser(user)).thenReturn(Optional.of(wallet));
    }

    @Test
    void testDetectCategorySpike() {
        AnalyticsResponse analytics30 = new AnalyticsResponse();
        analytics30.setTotalDebit(new BigDecimal("4000.00"));
        Map<String, BigDecimal> monthMap = new HashMap<>();
        monthMap.put("FOOD", new BigDecimal("1000.00")); // weekly baseline = 250.00
        analytics30.setSpendByCategory(monthMap);

        AnalyticsResponse analytics7 = new AnalyticsResponse();
        analytics7.setTotalDebit(new BigDecimal("900.00"));
        analytics7.setDailyAverageSpend(new BigDecimal("128.57"));
        Map<String, BigDecimal> weekMap = new HashMap<>();
        weekMap.put("FOOD", new BigDecimal("800.00")); // > 500 and > 250 * 1.5 (375)
        analytics7.setSpendByCategory(weekMap);

        when(analyticsService.getAnalytics("teen@example.com", 30)).thenReturn(analytics30);
        when(analyticsService.getAnalytics("teen@example.com", 7)).thenReturn(analytics7);
        when(walletGoalRepository.findByUser(user)).thenReturn(Collections.emptyList());

        List<AiBudgetAnomalyDto> anomalies = aiCoachService.detectAnomalies("teen@example.com");

        assertFalse(anomalies.isEmpty());
        Optional<AiBudgetAnomalyDto> foodSpike = anomalies.stream()
                .filter(a -> "CATEGORY_SPIKE".equals(a.getAnomalyType()) && "FOOD".equals(a.getCategory()))
                .findFirst();

        assertTrue(foodSpike.isPresent());
        assertEquals("ALERT", foodSpike.get().getSeverity());
        assertTrue(foodSpike.get().getTitle().contains("FOOD Spending Spike"));
    }

    @Test
    void testDetectWantsImbalance() {
        AnalyticsResponse analytics30 = new AnalyticsResponse();
        analytics30.setTotalDebit(new BigDecimal("3000.00"));
        analytics30.setSpendByCategory(new HashMap<>());

        AnalyticsResponse analytics7 = new AnalyticsResponse();
        analytics7.setTotalDebit(new BigDecimal("1500.00"));
        analytics7.setDailyAverageSpend(new BigDecimal("214.28"));
        Map<String, BigDecimal> weekMap = new HashMap<>();
        weekMap.put("SHOPPING", new BigDecimal("700.00")); // Want
        weekMap.put("ENTERTAINMENT", new BigDecimal("300.00")); // Want
        weekMap.put("TRANSPORT", new BigDecimal("500.00")); // Need
        // Total Wants = 1000 / 1500 = 66% (> 50%)
        analytics7.setSpendByCategory(weekMap);

        when(analyticsService.getAnalytics("teen@example.com", 30)).thenReturn(analytics30);
        when(analyticsService.getAnalytics("teen@example.com", 7)).thenReturn(analytics7);
        when(walletGoalRepository.findByUser(user)).thenReturn(Collections.emptyList());

        List<AiBudgetAnomalyDto> anomalies = aiCoachService.detectAnomalies("teen@example.com");

        Optional<AiBudgetAnomalyDto> wantsAlert = anomalies.stream()
                .filter(a -> "WANTS_IMBALANCE".equals(a.getAnomalyType()))
                .findFirst();

        assertTrue(wantsAlert.isPresent());
        assertEquals("WARNING", wantsAlert.get().getSeverity());
        assertTrue(wantsAlert.get().getMessage().contains("Non-essential purchases"));
    }

    @Test
    void testDetectGoalAtRisk() {
        AnalyticsResponse analytics30 = new AnalyticsResponse();
        analytics30.setTotalDebit(new BigDecimal("2000.00"));
        analytics30.setSpendByCategory(Collections.emptyMap());

        AnalyticsResponse analytics7 = new AnalyticsResponse();
        analytics7.setTotalDebit(new BigDecimal("300.00"));
        analytics7.setDailyAverageSpend(new BigDecimal("42.85"));
        analytics7.setSpendByCategory(Collections.emptyMap());

        when(analyticsService.getAnalytics("teen@example.com", 30)).thenReturn(analytics30);
        when(analyticsService.getAnalytics("teen@example.com", 7)).thenReturn(analytics7);

        WalletGoal goal = WalletGoal.builder()
                .id(UUID.randomUUID())
                .name("New Bike")
                .targetAmount(new BigDecimal("10000.00"))
                .currentAmount(new BigDecimal("2000.00")) // 20%
                .targetDate(LocalDate.now().plusDays(10)) // 10 days left, < 70%
                .status("ACTIVE")
                .build();

        when(walletGoalRepository.findByUser(user)).thenReturn(List.of(goal));

        List<AiBudgetAnomalyDto> anomalies = aiCoachService.detectAnomalies("teen@example.com");

        Optional<AiBudgetAnomalyDto> goalAlert = anomalies.stream()
                .filter(a -> "GOAL_AT_RISK".equals(a.getAnomalyType()))
                .findFirst();

        assertTrue(goalAlert.isPresent());
        assertEquals("WARNING", goalAlert.get().getSeverity());
        assertTrue(goalAlert.get().getTitle().contains("New Bike"));
    }

    @Test
    void testDetectBurnRateRisk() {
        AnalyticsResponse analytics30 = new AnalyticsResponse();
        analytics30.setTotalDebit(new BigDecimal("5000.00"));
        analytics30.setSpendByCategory(Collections.emptyMap());

        AnalyticsResponse analytics7 = new AnalyticsResponse();
        analytics7.setTotalDebit(new BigDecimal("2800.00"));
        analytics7.setDailyAverageSpend(new BigDecimal("400.00")); // burn rate 400/day
        analytics7.setSpendByCategory(Collections.emptyMap());

        when(analyticsService.getAnalytics("teen@example.com", 30)).thenReturn(analytics30);
        when(analyticsService.getAnalytics("teen@example.com", 7)).thenReturn(analytics7);
        when(walletGoalRepository.findByUser(user)).thenReturn(Collections.emptyList());

        // Wallet balance = 1500.00 / 400.00 = 3.75 days (< 7 days)
        List<AiBudgetAnomalyDto> anomalies = aiCoachService.detectAnomalies("teen@example.com");

        Optional<AiBudgetAnomalyDto> burnRateAlert = anomalies.stream()
                .filter(a -> "BURN_RATE_RISK".equals(a.getAnomalyType()))
                .findFirst();

        assertTrue(burnRateAlert.isPresent());
        assertEquals("ALERT", burnRateAlert.get().getSeverity());
        assertTrue(burnRateAlert.get().getTitle().contains("Wallet Depletion Risk"));
    }

    @Test
    void testRunProactiveScanSendsNotificationAndPublishesEvent() {
        AnalyticsResponse analytics30 = new AnalyticsResponse();
        analytics30.setTotalDebit(new BigDecimal("5000.00"));
        analytics30.setSpendByCategory(Collections.emptyMap());

        AnalyticsResponse analytics7 = new AnalyticsResponse();
        analytics7.setTotalDebit(new BigDecimal("2800.00"));
        analytics7.setDailyAverageSpend(new BigDecimal("400.00"));
        analytics7.setSpendByCategory(Collections.emptyMap());

        when(analyticsService.getAnalytics("teen@example.com", 30)).thenReturn(analytics30);
        when(analyticsService.getAnalytics("teen@example.com", 7)).thenReturn(analytics7);
        when(walletGoalRepository.findByUser(user)).thenReturn(Collections.emptyList());

        List<AiBudgetAnomalyDto> results = aiCoachService.runProactiveScan("teen@example.com");

        assertFalse(results.isEmpty());
        verify(notificationService, atLeastOnce()).sendNotification(
                eq(user), isNull(), eq(NotificationType.AI_INSIGHT), anyString(), anyString()
        );
        verify(eventPublisher, atLeastOnce()).publishEvent(any(AiBudgetAnomalyEvent.class));
    }

    @Test
    void testNoAnomaliesWhenSpendingHealthy() {
        AnalyticsResponse analytics30 = new AnalyticsResponse();
        analytics30.setTotalDebit(new BigDecimal("2000.00"));
        Map<String, BigDecimal> monthMap = new HashMap<>();
        monthMap.put("FOOD", new BigDecimal("1000.00"));
        analytics30.setSpendByCategory(monthMap);

        AnalyticsResponse analytics7 = new AnalyticsResponse();
        analytics7.setTotalDebit(new BigDecimal("300.00"));
        analytics7.setDailyAverageSpend(new BigDecimal("40.00"));
        Map<String, BigDecimal> weekMap = new HashMap<>();
        weekMap.put("FOOD", new BigDecimal("200.00")); // normal spend, < 500
        analytics7.setSpendByCategory(weekMap);

        when(analyticsService.getAnalytics("teen@example.com", 30)).thenReturn(analytics30);
        when(analyticsService.getAnalytics("teen@example.com", 7)).thenReturn(analytics7);
        when(walletGoalRepository.findByUser(user)).thenReturn(Collections.emptyList());

        List<AiBudgetAnomalyDto> anomalies = aiCoachService.detectAnomalies("teen@example.com");
        assertTrue(anomalies.isEmpty());
    }
}
