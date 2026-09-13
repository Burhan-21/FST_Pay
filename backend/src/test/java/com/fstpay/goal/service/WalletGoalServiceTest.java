package com.fstpay.goal.service;

import com.fstpay.common.event.EventPublisher;
import com.fstpay.common.event.GoalCompletedEvent;
import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.goal.dto.GoalCreateRequest;
import com.fstpay.goal.dto.GoalFundRequest;
import com.fstpay.goal.dto.UpdateGoalRequest;
import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.goal.repository.WalletGoalRepository;
import com.fstpay.transaction.entity.Transaction;
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
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WalletGoalServiceTest {

    @Mock
    private WalletGoalRepository walletGoalRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private WalletRepository walletRepository;
    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private EventPublisher eventPublisher;

    private WalletGoalService walletGoalService;

    private User user;
    private Wallet wallet;

    @BeforeEach
    void setUp() {
        walletGoalService = new WalletGoalService(
                walletGoalRepository, userRepository, walletRepository, transactionRepository, eventPublisher
        );
        ReflectionTestUtils.setField(walletGoalService, "goalCompletedPoints", 100);

        user = User.builder().id(UUID.randomUUID()).email("test@example.com").fullName("Test Teen").build();
        wallet = Wallet.builder().id(UUID.randomUUID()).user(user).balance(new BigDecimal("1000.00")).build();
    }

    @Test
    void createGoal_WithValidData_SavesAndReturnsGoal() {
        GoalCreateRequest request = GoalCreateRequest.builder()
                .name("New Bike")
                .targetAmount(new BigDecimal("500.00"))
                .targetDate(LocalDate.now().plusMonths(1))
                .priority("HIGH")
                .icon("🚴")
                .color("#FF5555")
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(walletGoalRepository.existsByUserAndNameIgnoreCaseAndStatus(user, "New Bike", "ACTIVE")).thenReturn(false);
        when(walletGoalRepository.save(any(WalletGoal.class))).thenAnswer(i -> i.getArgument(0));

        WalletGoal result = walletGoalService.createGoal("test@example.com", request);

        assertNotNull(result);
        assertEquals("New Bike", result.getName());
        assertEquals(new BigDecimal("500.00"), result.getTargetAmount());
        assertEquals("ACTIVE", result.getStatus());
        assertEquals("HIGH", result.getPriority());
    }

    @Test
    void createGoal_WithPastDate_ThrowsException() {
        GoalCreateRequest request = GoalCreateRequest.builder()
                .name("New Bike")
                .targetAmount(new BigDecimal("500.00"))
                .targetDate(LocalDate.now().minusDays(1))
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));

        assertThrows(BadRequestException.class, () -> walletGoalService.createGoal("test@example.com", request));
    }

    @Test
    void createGoal_WithDuplicateName_ThrowsException() {
        GoalCreateRequest request = GoalCreateRequest.builder()
                .name("Bike")
                .targetAmount(new BigDecimal("500.00"))
                .targetDate(LocalDate.now().plusMonths(1))
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(walletGoalRepository.existsByUserAndNameIgnoreCaseAndStatus(user, "Bike", "ACTIVE")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> walletGoalService.createGoal("test@example.com", request));
    }

    @Test
    void allocateFunds_WithValidAmount_DeductsFromWalletAndAddsToGoal() {
        UUID goalId = UUID.randomUUID();
        WalletGoal goal = WalletGoal.builder()
                .id(goalId)
                .user(user)
                .name("Bike")
                .targetAmount(new BigDecimal("500.00"))
                .currentAmount(BigDecimal.ZERO)
                .allocatedAmount(BigDecimal.ZERO)
                .status("ACTIVE")
                .build();

        GoalFundRequest request = GoalFundRequest.builder().amount(new BigDecimal("200.00")).build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(walletGoalRepository.findByIdAndUser(goalId, user)).thenReturn(Optional.of(goal));
        when(walletRepository.findByUser(user)).thenReturn(Optional.of(wallet));
        when(walletGoalRepository.save(any(WalletGoal.class))).thenAnswer(i -> i.getArgument(0));

        WalletGoal result = walletGoalService.allocateFunds("test@example.com", goalId, request);

        assertEquals(new BigDecimal("200.00"), result.getCurrentAmount());
        assertEquals(new BigDecimal("800.00"), wallet.getBalance());
        verify(transactionRepository, times(1)).save(any(Transaction.class));
    }

    @Test
    void allocateFunds_WithInsufficientWalletBalance_ThrowsException() {
        UUID goalId = UUID.randomUUID();
        WalletGoal goal = WalletGoal.builder()
                .id(goalId)
                .user(user)
                .name("Bike")
                .targetAmount(new BigDecimal("500.00"))
                .currentAmount(BigDecimal.ZERO)
                .status("ACTIVE")
                .build();

        GoalFundRequest request = GoalFundRequest.builder().amount(new BigDecimal("1200.00")).build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(walletGoalRepository.findByIdAndUser(goalId, user)).thenReturn(Optional.of(goal));
        when(walletRepository.findByUser(user)).thenReturn(Optional.of(wallet));

        assertThrows(BadRequestException.class, () -> walletGoalService.allocateFunds("test@example.com", goalId, request));
    }

    @Test
    void allocateFunds_CompletesGoalAndAwardsPoints() {
        UUID goalId = UUID.randomUUID();
        WalletGoal goal = WalletGoal.builder()
                .id(goalId)
                .user(user)
                .name("Bike")
                .targetAmount(new BigDecimal("500.00"))
                .currentAmount(new BigDecimal("400.00"))
                .allocatedAmount(new BigDecimal("400.00"))
                .status("ACTIVE")
                .build();

        GoalFundRequest request = GoalFundRequest.builder().amount(new BigDecimal("100.00")).build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(walletGoalRepository.findByIdAndUser(goalId, user)).thenReturn(Optional.of(goal));
        when(walletRepository.findByUser(user)).thenReturn(Optional.of(wallet));
        when(walletGoalRepository.save(any(WalletGoal.class))).thenAnswer(i -> i.getArgument(0));

        WalletGoal result = walletGoalService.allocateFunds("test@example.com", goalId, request);

        assertEquals("COMPLETED", result.getStatus());
        assertNotNull(result.getCompletedAt());
        verify(eventPublisher, times(1)).publish(any(GoalCompletedEvent.class));
    }

    @Test
    void withdrawFunds_WithValidAmount_RefundsToWallet() {
        UUID goalId = UUID.randomUUID();
        WalletGoal goal = WalletGoal.builder()
                .id(goalId)
                .user(user)
                .name("Bike")
                .targetAmount(new BigDecimal("500.00"))
                .currentAmount(new BigDecimal("300.00"))
                .withdrawnAmount(BigDecimal.ZERO)
                .status("ACTIVE")
                .build();

        GoalFundRequest request = GoalFundRequest.builder().amount(new BigDecimal("100.00")).build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(walletGoalRepository.findByIdAndUser(goalId, user)).thenReturn(Optional.of(goal));
        when(walletRepository.findByUser(user)).thenReturn(Optional.of(wallet));
        when(walletGoalRepository.save(any(WalletGoal.class))).thenAnswer(i -> i.getArgument(0));

        WalletGoal result = walletGoalService.withdrawFunds("test@example.com", goalId, request);

        assertEquals(new BigDecimal("200.00"), result.getCurrentAmount());
        assertEquals(new BigDecimal("1100.00"), wallet.getBalance());
        assertEquals(new BigDecimal("100.00"), result.getWithdrawnAmount());
    }

    @Test
    void setRoundUpTarget_EnablesGoalAndDisablesOthers() {
        UUID goal1Id = UUID.randomUUID();
        UUID goal2Id = UUID.randomUUID();

        WalletGoal goal1 = WalletGoal.builder().id(goal1Id).user(user).name("Goal 1").roundUpEnabled(true).status("ACTIVE").build();
        WalletGoal goal2 = WalletGoal.builder().id(goal2Id).user(user).name("Goal 2").roundUpEnabled(false).status("ACTIVE").build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(walletGoalRepository.findByIdAndUser(goal2Id, user)).thenReturn(Optional.of(goal2));
        when(walletGoalRepository.findByUserAndRoundUpEnabledTrue(user)).thenReturn(java.util.List.of(goal1));
        when(walletGoalRepository.save(any(WalletGoal.class))).thenAnswer(i -> i.getArgument(0));

        com.fstpay.goal.dto.RoundUpRuleResponse response = walletGoalService.setRoundUpTarget("test@example.com", goal2Id, 50);

        assertTrue(response.isEnabled());
        assertEquals(goal2Id, response.getGoalId());
        assertEquals(50, response.getRoundUpNearest());
        assertFalse(goal1.getRoundUpEnabled());
        assertTrue(goal2.getRoundUpEnabled());
    }

    @Test
    void processRoundUp_CalculatesSpareChangeAndCreditsGoal() {
        UUID goalId = UUID.randomUUID();
        WalletGoal goal = WalletGoal.builder()
                .id(goalId)
                .user(user)
                .name("New Bike")
                .targetAmount(new BigDecimal("1000.00"))
                .currentAmount(new BigDecimal("100.00"))
                .allocatedAmount(new BigDecimal("100.00"))
                .roundUpAccumulated(BigDecimal.ZERO)
                .roundUpEnabled(true)
                .roundUpNearest(50)
                .status("ACTIVE")
                .build();

        when(walletGoalRepository.findByUserAndRoundUpEnabledTrueAndStatus(user, "ACTIVE"))
                .thenReturn(Optional.of(goal));
        when(walletRepository.save(any(Wallet.class))).thenAnswer(i -> i.getArgument(0));
        when(walletGoalRepository.save(any(WalletGoal.class))).thenAnswer(i -> i.getArgument(0));

        // Wallet has ₹1000. Spend is ₹42. Step is 50. Spare change is ₹8.
        WalletGoalService.RoundUpExecutionResult result = walletGoalService.processRoundUp(user, new BigDecimal("42.00"), wallet);

        assertNotNull(result);
        assertEquals(new BigDecimal("8.00"), result.getRoundUpAmount());
        assertEquals(goalId, result.getGoalId());
        assertEquals("New Bike", result.getGoalName());

        // Wallet balance after deduction of ₹8
        assertEquals(new BigDecimal("992.00"), wallet.getBalance());
        // Goal current amount increased from ₹100 to ₹108
        assertEquals(new BigDecimal("108.00"), goal.getCurrentAmount());
        assertEquals(new BigDecimal("8.00"), goal.getRoundUpAccumulated());
    }

    @Test
    void processRoundUp_ExactMultiple_ReturnsNull() {
        WalletGoal goal = WalletGoal.builder()
                .user(user)
                .name("Savings")
                .roundUpEnabled(true)
                .roundUpNearest(50)
                .status("ACTIVE")
                .build();

        when(walletGoalRepository.findByUserAndRoundUpEnabledTrueAndStatus(user, "ACTIVE"))
                .thenReturn(Optional.of(goal));

        // Spend is exactly ₹100, which is multiple of 50. Spare change is 0.
        WalletGoalService.RoundUpExecutionResult result = walletGoalService.processRoundUp(user, new BigDecimal("100.00"), wallet);

        assertNull(result);
    }

    @Test
    void processRoundUp_InsufficientBalance_ReturnsNull() {
        WalletGoal goal = WalletGoal.builder()
                .user(user)
                .name("Savings")
                .roundUpEnabled(true)
                .roundUpNearest(50)
                .status("ACTIVE")
                .build();

        when(walletGoalRepository.findByUserAndRoundUpEnabledTrueAndStatus(user, "ACTIVE"))
                .thenReturn(Optional.of(goal));

        wallet.setBalance(new BigDecimal("2.00")); // Wallet only has ₹2, but spare change is ₹8

        WalletGoalService.RoundUpExecutionResult result = walletGoalService.processRoundUp(user, new BigDecimal("42.00"), wallet);

        assertNull(result);
        assertEquals(new BigDecimal("2.00"), wallet.getBalance()); // Unchanged
    }
}
