package com.fstpay.report.service;

import com.fstpay.aicoach.dto.HealthScoreResponse;
import com.fstpay.aicoach.service.AiCoachService;
import com.fstpay.goal.repository.WalletGoalRepository;
import com.fstpay.notification.service.EmailProvider;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.user.entity.User;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MonthlyReportServiceTest {

    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private WalletRepository walletRepository;
    @Mock
    private WalletGoalRepository walletGoalRepository;
    @Mock
    private AiCoachService aiCoachService;
    @Mock
    private EmailProvider emailProvider;

    private MonthlyReportService monthlyReportService;

    private User user;
    private Wallet wallet;

    @BeforeEach
    void setUp() {
        monthlyReportService = new MonthlyReportService(
                transactionRepository, walletRepository, walletGoalRepository, aiCoachService, emailProvider
        );

        user = User.builder().id(UUID.randomUUID()).email("test@example.com").fullName("Test Teen").build();
        wallet = Wallet.builder().id(UUID.randomUUID()).user(user).balance(new BigDecimal("1000.00")).build();
    }

    @Test
    void generateReportPdf_CreatesNonEmptyBytes() {
        Instant end = Instant.now();
        Instant start = end.minus(30, ChronoUnit.DAYS);

        when(walletRepository.findByUser(user)).thenReturn(Optional.of(wallet));
        when(transactionRepository.findByWalletIdAndCreatedAtBetween(eq(wallet.getId()), any(Instant.class), any(Instant.class)))
                .thenReturn(new ArrayList<>());
        when(walletGoalRepository.findByUser(user)).thenReturn(new ArrayList<>());

        HealthScoreResponse mockHealth = new HealthScoreResponse();
        mockHealth.setScore(85);
        mockHealth.setRating("EXCELLENT");
        when(aiCoachService.getHealthScore("test@example.com")).thenReturn(mockHealth);
        when(aiCoachService.getPersonalizedTips("test@example.com")).thenReturn(new ArrayList<>());

        byte[] result = monthlyReportService.generateMonthlyReportPdf(user, start, end);

        assertNotNull(result);
        assertTrue(result.length > 0);
    }
}
