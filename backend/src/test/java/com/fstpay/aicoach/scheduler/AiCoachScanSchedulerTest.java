package com.fstpay.aicoach.scheduler;

import com.fstpay.aicoach.dto.AiBudgetAnomalyDto;
import com.fstpay.aicoach.service.AiCoachService;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiCoachScanSchedulerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AiCoachService aiCoachService;

    @InjectMocks
    private AiCoachScanScheduler scheduler;

    @Test
    void testRunWeeklyProactiveScansOnlyRunsForUsers() {
        User regularUser = User.builder()
                .id(UUID.randomUUID())
                .email("teen@example.com")
                .role("USER")
                .build();

        User adminUser = User.builder()
                .id(UUID.randomUUID())
                .email("admin@example.com")
                .role("ADMIN")
                .build();

        when(userRepository.findAll()).thenReturn(List.of(regularUser, adminUser));
        when(aiCoachService.runProactiveScan("teen@example.com")).thenReturn(List.of(new AiBudgetAnomalyDto()));

        scheduler.runWeeklyProactiveScans();

        verify(aiCoachService, times(1)).runProactiveScan("teen@example.com");
        verify(aiCoachService, never()).runProactiveScan("admin@example.com");
    }

    @Test
    void testRunWeeklyProactiveScansHandlesExceptionsGracefully() {
        User regularUser = User.builder()
                .id(UUID.randomUUID())
                .email("error@example.com")
                .role("USER")
                .build();

        when(userRepository.findAll()).thenReturn(List.of(regularUser));
        when(aiCoachService.runProactiveScan("error@example.com")).thenThrow(new RuntimeException("Simulated error"));

        // Should not throw, logs error and continues
        scheduler.runWeeklyProactiveScans();

        verify(aiCoachService, times(1)).runProactiveScan("error@example.com");
    }
}
