package com.fstpay.aicoach.service;

import com.fstpay.aicoach.dto.BudgetPlanningResponse;
import com.fstpay.aicoach.dto.ForecastResponse;
import com.fstpay.aicoach.dto.HealthScoreResponse;
import com.fstpay.aicoach.provider.FallbackProvider;
import com.fstpay.aicoach.provider.GeminiProvider;
import com.fstpay.aicoach.provider.OpenAiProvider;
import com.fstpay.aicoach.repository.AiSessionRepository;
import com.fstpay.aicoach.strategy.TipStrategy;
import com.fstpay.analytics.dto.AnalyticsResponse;
import com.fstpay.analytics.service.AnalyticsService;
import com.fstpay.goal.repository.WalletGoalRepository;
import com.fstpay.reward.repository.RewardPointsRepository;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiCoachServiceTest {

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
    private com.fstpay.notification.service.NotificationService notificationService;
    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    private AiCoachService aiCoachService;

    private User user;
    private Wallet wallet;
    private AnalyticsResponse analyticsResponse;

    @BeforeEach
    void setUp() {
        aiCoachService = new AiCoachService(
                aiSessionRepository, userRepository, analyticsService, walletRepository,
                transactionRepository, walletGoalRepository, rewardPointsRepository,
                geminiProvider, openAiProvider, fallbackProvider, new ArrayList<>(),
                meterRegistry, notificationService, eventPublisher
        );

        user = User.builder().id(UUID.randomUUID()).email("test@example.com").fullName("Test Teen").build();
        wallet = Wallet.builder().id(UUID.randomUUID()).user(user).balance(new BigDecimal("1000.00")).build();

        analyticsResponse = new AnalyticsResponse();
        analyticsResponse.setTotalCredit(new BigDecimal("5000.00"));
        analyticsResponse.setTotalDebit(new BigDecimal("2000.00"));
        analyticsResponse.setNetSavings(new BigDecimal("3000.00"));
        analyticsResponse.setDailyAverageSpend(new BigDecimal("66.67"));
        analyticsResponse.setSpendByCategory(new HashMap<>());
    }

    @Test
    void getHealthScore_WithGoodSavings_CalculatesCorrectScore() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(walletRepository.findByUser(user)).thenReturn(Optional.of(wallet));
        when(analyticsService.getAnalytics("test@example.com", 30)).thenReturn(analyticsResponse);
        when(walletGoalRepository.findByUser(user)).thenReturn(new ArrayList<>());
        when(rewardPointsRepository.findByUser(user)).thenReturn(Optional.empty());

        HealthScoreResponse result = aiCoachService.getHealthScore("test@example.com");

        assertNotNull(result);
        assertTrue(result.getScore() > 0);
        assertEquals("EXCELLENT", result.getRating());
    }

    @Test
    void getBudgetPlan_GeneratesValidSplit() {
        when(analyticsService.getAnalytics("test@example.com", 30)).thenReturn(analyticsResponse);

        BudgetPlanningResponse result = aiCoachService.getBudgetPlan("test@example.com");

        assertNotNull(result);
        assertEquals(new BigDecimal("2500.00"), result.getRecommendedAllocation().get("Needs"));
        assertEquals(new BigDecimal("1500.00"), result.getRecommendedAllocation().get("Wants"));
        assertEquals(new BigDecimal("1000.00"), result.getRecommendedAllocation().get("Savings"));
    }

    @Test
    void getForecast_GeneratesMonteCarloProjections() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(walletRepository.findByUser(user)).thenReturn(Optional.of(wallet));
        when(analyticsService.getAnalytics("test@example.com", 30)).thenReturn(analyticsResponse);
        when(walletGoalRepository.findByUser(user)).thenReturn(new ArrayList<>());

        ForecastResponse result = aiCoachService.getForecast("test@example.com");

        assertNotNull(result);
        assertEquals(30, result.getPoints().size());
        assertEquals("Monte Carlo Stochastic Simulation (M=200)", result.getModelUsed());
        assertNotNull(result.getCurrentBalance());
        assertEquals(new BigDecimal("1000.00"), result.getCurrentBalance());
        assertNotNull(result.getDailyBurnMean());
        assertNotNull(result.getDailyBurnStdDev());
        assertNotNull(result.getRunoutProbability());

        // Check percentiles for day 1
        ForecastResponse.ForecastPoint day1 = result.getPoints().get(0);
        assertNotNull(day1.getMedianBalance());
        assertNotNull(day1.getOptimisticBalance());
        assertNotNull(day1.getPessimisticBalance());
        assertNotNull(day1.getPredictedCumulativeSpend());

        // Optimistic balance should be >= median >= pessimistic
        assertTrue(day1.getOptimisticBalance().compareTo(day1.getMedianBalance()) >= 0);
        assertTrue(day1.getMedianBalance().compareTo(day1.getPessimisticBalance()) >= 0);
    }

    @Test
    void providerSelection_DefaultsToFallback_WhenOthersUnavailable() {
        // Set config setting to gemini
        ReflectionTestUtils.setField(aiCoachService, "aiProvider", "gemini");

        io.micrometer.core.instrument.Counter counter = mock(io.micrometer.core.instrument.Counter.class);
        when(meterRegistry.counter(eq("fstpay.ai.requests.total"), any(String[].class))).thenReturn(counter);

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(walletRepository.findByUser(user)).thenReturn(Optional.of(wallet));
        when(analyticsService.getAnalytics("test@example.com", 30)).thenReturn(analyticsResponse);
        when(transactionRepository.findTop5ByWalletOrderByCreatedAtDesc(wallet)).thenReturn(new ArrayList<>());
        when(aiSessionRepository.findByUser(eq(user), any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(Collections.emptyList()));

        when(geminiProvider.isAvailable()).thenReturn(false);
        when(fallbackProvider.generateReply(anyString(), anyString(), anyString(), anyString()))
                .thenReturn("Fallback answer");

        com.fstpay.aicoach.dto.ChatRequest chatReq = new com.fstpay.aicoach.dto.ChatRequest();
        chatReq.setMessage("hello");

        com.fstpay.aicoach.dto.ChatResponse response = aiCoachService.chat("test@example.com", chatReq);

        assertNotNull(response);
        assertEquals("Fallback answer", response.getReply());
        verify(fallbackProvider, times(1)).generateReply(anyString(), anyString(), anyString(), anyString());
        verify(counter, times(1)).increment();
    }
}
