package com.fstpay.auth.service;

import com.fstpay.auth.dto.LoginRequest;
import com.fstpay.auth.dto.RegisterRequest;
import com.fstpay.auth.repository.PasswordResetTokenRepository;
import com.fstpay.auth.repository.RefreshTokenRepository;
import com.fstpay.auth.security.JwtProvider;
import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.DuplicateResourceException;
import com.fstpay.common.service.AuditService;
import com.fstpay.notification.service.EmailService;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private WalletRepository walletRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private JwtProvider jwtProvider;
    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private OtpService otpService;
    @Mock
    private EmailService emailService;
    @Mock
    private RecaptchaService recaptchaService;
    @Mock
    private AuditService auditService;
    @Mock
    private EntityManager entityManager;

    private PasswordEncoder passwordEncoder;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder(12);
        authService = new AuthService(
                userRepository, walletRepository, refreshTokenRepository,
                passwordResetTokenRepository, passwordEncoder, jwtProvider,
                otpService, emailService, recaptchaService, auditService, entityManager
        );
        when(recaptchaService.verifyToken(any())).thenReturn(true);
        lenient().when(otpService.generateOtp(anyString())).thenReturn("123456");
        lenient().doNothing().when(emailService).sendOtpEmail(anyString(), anyString());
    }

    private RegisterRequest createValidRegisterRequest() {
        RegisterRequest request = new RegisterRequest();
        request.setFullName("Test User");
        request.setEmail("test@example.com");
        request.setPassword("Password@123");
        request.setDateOfBirth(LocalDate.of(2008, 6, 15)); // 18 years old
        return request;
    }

    @Test
    void register_WithValidData_CreatesUserAndWallet() {
        RegisterRequest request = createValidRegisterRequest();

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        when(walletRepository.save(any(Wallet.class))).thenAnswer(i -> i.getArgument(0));

        var result = authService.register(request);

        assertNotNull(result);
        assertTrue(result.getRequiresOtp());
        verify(userRepository).save(any(User.class));
        verify(walletRepository).save(any(Wallet.class));
    }

    @Test
    void register_WithDuplicateEmail_ThrowsException() {
        RegisterRequest request = createValidRegisterRequest();
        request.setEmail("existing@example.com");

        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_WithShortPassword_ThrowsException() {
        RegisterRequest request = createValidRegisterRequest();
        request.setPassword("1234567");

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.register(request));
        assertTrue(ex.getMessage().contains("Password must be at least 8 characters"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_WithNullDateOfBirth_ThrowsException() {
        RegisterRequest request = createValidRegisterRequest();
        request.setDateOfBirth(null);

        assertThrows(BadRequestException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_WithUnderageUser_ThrowsException() {
        RegisterRequest request = createValidRegisterRequest();
        request.setDateOfBirth(LocalDate.now().minusYears(10)); // 10 years old

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.register(request));
        assertTrue(ex.getMessage().contains("12"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_WithTooOldDateOfBirth_ThrowsException() {
        RegisterRequest request = createValidRegisterRequest();
        request.setDateOfBirth(LocalDate.now().minusYears(150)); // 150 years old

        assertThrows(BadRequestException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void login_WithValidCredentials_ReturnsRequiresOtp() {
        String email = "test@example.com";
        String rawPassword = "password123";
        String encodedPassword = passwordEncoder.encode(rawPassword);

        User user = User.builder()
                .id(UUID.randomUUID())
                .email(email)
                .passwordHash(encodedPassword)
                .fullName("Test User")
                .role("USER")
                .isActive(true)
                .loginAttempts(0)
                .build();

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        LoginRequest request = new LoginRequest();
        request.setEmail(email);
        request.setPassword(rawPassword);

        var result = authService.login(request);

        assertNotNull(result);
        assertTrue(result.getRequiresOtp());
        assertEquals(0, user.getLoginAttempts()); // Reset on success
    }

    @Test
    void login_WithInvalidPassword_IncrementsAttempts() {
        String email = "test@example.com";
        String encodedPassword = passwordEncoder.encode("correct-password");

        User user = User.builder()
                .id(UUID.randomUUID())
                .email(email)
                .passwordHash(encodedPassword)
                .fullName("Test User")
                .isActive(true)
                .loginAttempts(0)
                .build();

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        LoginRequest request = new LoginRequest();
        request.setEmail(email);
        request.setPassword("wrong-password");

        assertThrows(BadRequestException.class, () -> authService.login(request));
        assertEquals(1, user.getLoginAttempts());
    }

    @Test
    void login_AfterMaxAttempts_LocksAccount() {
        String email = "locked@example.com";
        String encodedPassword = passwordEncoder.encode("correct-password");

        User user = User.builder()
                .id(UUID.randomUUID())
                .email(email)
                .passwordHash(encodedPassword)
                .fullName("Locked User")
                .isActive(true)
                .loginAttempts(5)
                .lockedUntil(Instant.now().plusSeconds(900))
                .build();

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));

        LoginRequest request = new LoginRequest();
        request.setEmail(email);
        request.setPassword("any-password");

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.login(request));
        assertTrue(ex.getMessage().contains("locked"));
    }

    @Test
    void login_WithNonexistentEmail_ThrowsException() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        LoginRequest request = new LoginRequest();
        request.setEmail("nobody@example.com");
        request.setPassword("password123");

        assertThrows(BadRequestException.class, () -> authService.login(request));
    }
}
