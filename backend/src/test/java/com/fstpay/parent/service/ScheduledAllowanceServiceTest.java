package com.fstpay.parent.service;

import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.goal.repository.WalletGoalRepository;
import com.fstpay.goal.service.WalletGoalService;
import com.fstpay.notification.enums.NotificationType;
import com.fstpay.notification.service.NotificationService;
import com.fstpay.parent.dto.CreateAllowanceRequest;
import com.fstpay.parent.dto.ScheduledAllowanceResponse;
import com.fstpay.parent.dto.UpdateAllowanceRequest;
import com.fstpay.parent.entity.ScheduledAllowance;
import com.fstpay.parent.enums.AllowanceFrequency;
import com.fstpay.parent.repository.ScheduledAllowanceRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.api.WalletOperations;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScheduledAllowanceServiceTest {

    @Mock
    private ScheduledAllowanceRepository scheduledAllowanceRepository;
    @Mock
    private ParentLinkService parentLinkService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private WalletRepository walletRepository;
    @Mock
    private WalletOperations walletService;
    @Mock
    private WalletGoalRepository walletGoalRepository;
    @Mock
    private WalletGoalService walletGoalService;
    @Mock
    private NotificationService notificationService;

    private ScheduledAllowanceService allowanceService;
    private SimpleMeterRegistry meterRegistry;

    private User parent;
    private User child;
    private Wallet parentWallet;
    private WalletGoal goal;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        allowanceService = new ScheduledAllowanceService(
                scheduledAllowanceRepository,
                parentLinkService,
                userRepository,
                walletRepository,
                walletService,
                walletGoalRepository,
                walletGoalService,
                notificationService
        );
        allowanceService.setMeterRegistry(meterRegistry);

        parent = User.builder()
                .id(UUID.randomUUID())
                .email("parent@example.com")
                .fullName("John Parent")
                .role("PARENT")
                .build();

        child = User.builder()
                .id(UUID.randomUUID())
                .email("teen@example.com")
                .fullName("Timmy Teen")
                .role("USER")
                .build();

        parentWallet = Wallet.builder()
                .id(UUID.randomUUID())
                .user(parent)
                .balance(new BigDecimal("1000.00"))
                .build();

        goal = WalletGoal.builder()
                .id(UUID.randomUUID())
                .user(child)
                .name("New Laptop")
                .targetAmount(new BigDecimal("5000.00"))
                .currentAmount(BigDecimal.ZERO)
                .status("ACTIVE")
                .build();
    }

    @Test
    void createAllowance_success() {
        CreateAllowanceRequest request = CreateAllowanceRequest.builder()
                .childId(child.getId())
                .amount(new BigDecimal("250.00"))
                .frequency(AllowanceFrequency.WEEKLY)
                .dayOfWeek(DayOfWeek.FRIDAY)
                .note("Weekly lunch allowance")
                .build();

        when(userRepository.findByEmail(parent.getEmail())).thenReturn(Optional.of(parent));
        when(parentLinkService.getAuthorizedChild(parent.getEmail(), child.getId())).thenReturn(child);
        when(scheduledAllowanceRepository.save(any(ScheduledAllowance.class))).thenAnswer(invocation -> {
            ScheduledAllowance saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        ScheduledAllowanceResponse response = allowanceService.createAllowance(parent.getEmail(), request);

        assertNotNull(response);
        assertEquals(new BigDecimal("250.00"), response.getAmount());
        assertEquals(AllowanceFrequency.WEEKLY, response.getFrequency());
        assertEquals("Timmy Teen", response.getChildName());
        assertTrue(response.getActive());
        assertNotNull(response.getNextRunDate());
        verify(scheduledAllowanceRepository, times(1)).save(any(ScheduledAllowance.class));
    }

    @Test
    void createAllowance_withTargetGoal_success() {
        CreateAllowanceRequest request = CreateAllowanceRequest.builder()
                .childId(child.getId())
                .amount(new BigDecimal("500.00"))
                .frequency(AllowanceFrequency.MONTHLY)
                .dayOfMonth(1)
                .targetGoalId(goal.getId())
                .note("Savings allowance")
                .build();

        when(userRepository.findByEmail(parent.getEmail())).thenReturn(Optional.of(parent));
        when(parentLinkService.getAuthorizedChild(parent.getEmail(), child.getId())).thenReturn(child);
        when(walletGoalRepository.findByIdAndUser(goal.getId(), child)).thenReturn(Optional.of(goal));
        when(scheduledAllowanceRepository.save(any(ScheduledAllowance.class))).thenAnswer(invocation -> {
            ScheduledAllowance saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        ScheduledAllowanceResponse response = allowanceService.createAllowance(parent.getEmail(), request);

        assertNotNull(response);
        assertEquals(goal.getId(), response.getTargetGoalId());
        assertEquals("New Laptop", response.getTargetGoalName());
    }

    @Test
    void executeScheduledAllowance_success_withoutGoal() {
        ScheduledAllowance schedule = ScheduledAllowance.builder()
                .id(UUID.randomUUID())
                .parent(parent)
                .child(child)
                .amount(new BigDecimal("100.00"))
                .frequency(AllowanceFrequency.WEEKLY)
                .dayOfWeek(DayOfWeek.MONDAY)
                .active(true)
                .nextRunDate(LocalDate.now())
                .build();

        when(walletRepository.findByUser(parent)).thenReturn(Optional.of(parentWallet));
        when(scheduledAllowanceRepository.save(any(ScheduledAllowance.class))).thenReturn(schedule);

        boolean result = allowanceService.executeScheduledAllowance(schedule);

        assertTrue(result);
        verify(walletService, times(1)).transfer(eq(parent), eq(child), eq(new BigDecimal("100.00")), eq("TRANSFER"), anyString(), eq("FST Pay Family"));
        verify(notificationService, times(2)).sendNotification(any(), any(), eq(NotificationType.POCKET_MONEY), anyString(), anyString());
        assertEquals(1.0, meterRegistry.counter("fstpay.allowance.sweeps.total", "status", "success", "frequency", "WEEKLY").count());
        assertEquals(100.0, meterRegistry.counter("fstpay.allowance.amount.total").count());
        assertEquals(LocalDate.now(), schedule.getLastRunDate());
    }

    @Test
    void executeScheduledAllowance_success_withDirectGoalAutoSweep() {
        ScheduledAllowance schedule = ScheduledAllowance.builder()
                .id(UUID.randomUUID())
                .parent(parent)
                .child(child)
                .amount(new BigDecimal("300.00"))
                .frequency(AllowanceFrequency.WEEKLY)
                .dayOfWeek(DayOfWeek.MONDAY)
                .targetGoal(goal)
                .active(true)
                .nextRunDate(LocalDate.now())
                .build();

        when(walletRepository.findByUser(parent)).thenReturn(Optional.of(parentWallet));
        when(scheduledAllowanceRepository.save(any(ScheduledAllowance.class))).thenReturn(schedule);

        boolean result = allowanceService.executeScheduledAllowance(schedule);

        assertTrue(result);
        verify(walletService, times(1)).transfer(eq(parent), eq(child), eq(new BigDecimal("300.00")), anyString(), anyString(), anyString());
        verify(walletGoalService, times(1)).allocateFundsFromTransfer(eq(child), eq(goal), eq(new BigDecimal("300.00")));
        assertEquals(1.0, meterRegistry.counter("fstpay.allowance.sweeps.total", "status", "success", "frequency", "WEEKLY").count());
    }

    @Test
    void executeScheduledAllowance_insufficientFunds() {
        parentWallet.setBalance(new BigDecimal("10.00")); // Less than allowance amount
        ScheduledAllowance schedule = ScheduledAllowance.builder()
                .id(UUID.randomUUID())
                .parent(parent)
                .child(child)
                .amount(new BigDecimal("100.00"))
                .frequency(AllowanceFrequency.WEEKLY)
                .active(true)
                .nextRunDate(LocalDate.now())
                .build();

        when(walletRepository.findByUser(parent)).thenReturn(Optional.of(parentWallet));

        boolean result = allowanceService.executeScheduledAllowance(schedule);

        assertFalse(result);
        verify(walletService, never()).transfer(any(), any(), any(), any(), any(), any());
        verify(notificationService, times(1)).sendNotification(eq(parent), isNull(), eq(NotificationType.POCKET_MONEY), contains("Low Balance"), anyString());
        assertEquals(1.0, meterRegistry.counter("fstpay.allowance.sweeps.total", "status", "insufficient_funds", "frequency", "WEEKLY").count());
    }

    @Test
    void executeAllDueAllowances_runsOnlyDueSchedules() {
        ScheduledAllowance dueSchedule = ScheduledAllowance.builder()
                .id(UUID.randomUUID())
                .parent(parent)
                .child(child)
                .amount(new BigDecimal("50.00"))
                .frequency(AllowanceFrequency.WEEKLY)
                .active(true)
                .nextRunDate(LocalDate.now())
                .build();

        when(scheduledAllowanceRepository.findByActiveTrueAndNextRunDateLessThanEqual(LocalDate.now()))
                .thenReturn(List.of(dueSchedule));
        when(walletRepository.findByUser(parent)).thenReturn(Optional.of(parentWallet));
        when(scheduledAllowanceRepository.save(any())).thenReturn(dueSchedule);

        int processed = allowanceService.executeAllDueAllowances();

        assertEquals(1, processed);
        verify(walletService, times(1)).transfer(any(), any(), any(), any(), any(), any());
    }

    @Test
    void calculateNextRunDate_computesCorrectly() {
        LocalDate now = LocalDate.of(2026, 9, 14); // Monday

        // Weekly on Wednesday
        LocalDate nextWed = allowanceService.calculateNextRunDate(AllowanceFrequency.WEEKLY, DayOfWeek.WEDNESDAY, null, now);
        assertEquals(DayOfWeek.WEDNESDAY, nextWed.getDayOfWeek());
        assertTrue(nextWed.isAfter(now));

        // Monthly on the 1st
        LocalDate nextFirst = allowanceService.calculateNextRunDate(AllowanceFrequency.MONTHLY, null, 1, now);
        assertEquals(1, nextFirst.getDayOfMonth());
        assertEquals(10, nextFirst.getMonthValue()); // Next month since 14 > 1
    }
}
