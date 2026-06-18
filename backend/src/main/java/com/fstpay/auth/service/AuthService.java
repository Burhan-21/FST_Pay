package com.fstpay.auth.service;

import com.fstpay.auth.dto.*;
import com.fstpay.auth.entity.PasswordResetToken;
import com.fstpay.auth.entity.RefreshToken;
import com.fstpay.auth.repository.PasswordResetTokenRepository;
import com.fstpay.auth.repository.RefreshTokenRepository;
import com.fstpay.auth.security.JwtProvider;
import com.fstpay.common.exception.*;
import com.fstpay.common.service.AuditService;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import com.fstpay.notification.service.EmailService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final OtpService otpService;
    private final EmailService emailService;
    private final RecaptchaService recaptchaService;
    private final AuditService auditService;
    private final EntityManager entityManager;

    @Value("${app.auth.max-login-attempts:5}")
    private int maxLoginAttempts;

    @Value("${app.auth.lockout-duration-minutes:15}")
    private long lockoutDurationMinutes;

    @Value("${app.auth.password-reset-token-expiry-minutes:30}")
    private long passwordResetTokenExpiryMinutes;

    @Transactional
    public TokenResponse register(RegisterRequest request) {
        if (!recaptchaService.verifyToken(request.getRecaptchaToken())) {
            auditService.logAuthEvent(request.getEmail(), "REGISTER_FAILED", "Invalid reCAPTCHA token");
            throw new BadRequestException("Invalid reCAPTCHA token");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            auditService.logAuthEvent(request.getEmail(), "REGISTER_FAILED", "Email already registered");
            throw new DuplicateResourceException("Email is already registered");
        }

        if (request.getPassword() == null || request.getPassword().length() < 8) {
            throw new BadRequestException("Password must be at least 8 characters long");
        }

        if (request.getDateOfBirth() == null) {
            throw new BadRequestException("Date of birth is required");
        }

        int age = Period.between(request.getDateOfBirth(), LocalDate.now()).getYears();
        if (age < 12) {
            throw new BadRequestException("You must be at least 12 years old to register");
        }

        if (age > 100) {
            throw new BadRequestException("Invalid date of birth");
        }

        User user = User.builder()
                .email(request.getEmail().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                .dateOfBirth(request.getDateOfBirth())
                .role("USER")
                .isActive(false)
                .build();

        User savedUser = userRepository.save(user);

        Wallet wallet = Wallet.builder()
                .user(savedUser)
                .balance(BigDecimal.ZERO)
                .currency("INR")
                .isActive(true)
                .build();
        walletRepository.save(wallet);

        String otp = otpService.generateOtp(user.getEmail());
        if (otp != null) {
            emailService.sendOtpEmail(user.getEmail(), otp);
        }

        auditService.logAuthEvent(user.getEmail(), "REGISTER_SUCCESS", "Account created, OTP sent");
        log.info("Registered user: {}", savedUser.getEmail());

        return TokenResponse.builder()
                .requiresOtp(true)
                .build();
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {
        if (!recaptchaService.verifyToken(request.getRecaptchaToken())) {
            auditService.logAuthEvent("unknown", "LOGIN_FAILED", "Invalid reCAPTCHA token");
            throw new BadRequestException("Invalid email or password");
        }

        String email = request.getEmail().toLowerCase().trim();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    auditService.logAuthEvent(email, "LOGIN_FAILED", "User not found");
                    return new BadRequestException("Invalid email or password");
                });

        // Use pessimistic lock to prevent race conditions on login attempts
        entityManager.lock(user, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);

        // Check if user account is locked
        if (user.getLoginAttempts() != null && user.getLoginAttempts() >= maxLoginAttempts) {
            if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now())) {
                long minutesRemaining = ChronoUnit.MINUTES.between(Instant.now(), user.getLockedUntil());
                auditService.logAuthEvent(email, "LOGIN_BLOCKED", "Account locked for " + minutesRemaining + " more minutes");
                throw new BadRequestException("Account locked due to too many failed login attempts. Try again in " + minutesRemaining + " minutes.");
            }
            // Lock expired — reset
            user.setLoginAttempts(0);
            user.setLockedUntil(null);
            userRepository.save(user);
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            int attempts = (user.getLoginAttempts() != null ? user.getLoginAttempts() : 0) + 1;
            user.setLoginAttempts(attempts);

            if (attempts >= maxLoginAttempts) {
                user.setLockedUntil(Instant.now().plus(lockoutDurationMinutes, ChronoUnit.MINUTES));
                log.warn("Account locked due to failed login attempts: {}", email);
                auditService.logAuthEvent(email, "ACCOUNT_LOCKED", "Account locked after " + attempts + " failed attempts");
            } else {
                auditService.logAuthEvent(email, "LOGIN_FAILED", "Invalid password (attempt " + attempts + ")");
            }
            userRepository.save(user);
            throw new BadRequestException("Invalid email or password");
        }

        // Reset failed attempts on success
        user.setLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        // Trigger OTP verification (rate-limited per email)
        String otp = otpService.generateOtp(user.getEmail());
        if (otp == null) {
            auditService.logAuthEvent(email, "OTP_RATE_LIMITED", "OTP generation rate limited");
            throw new BadRequestException("Please wait before requesting a new OTP.");
        }
        emailService.sendOtpEmail(user.getEmail(), otp);

        auditService.logAuthEvent(email, "OTP_SENT", "Login OTP sent");
        log.info("Login OTP sent for user: {}", email);

        return TokenResponse.builder()
                .requiresOtp(true)
                .build();
    }

    @Transactional
    public TokenResponse verifyOtp(VerifyOtpRequest request) {
        String email = request.getEmail().toLowerCase().trim();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!otpService.verifyOtp(email, request.getOtp())) {
            auditService.logAuthEvent(email, "OTP_FAILED", "Invalid or expired OTP");
            throw new BadRequestException("Invalid or expired OTP");
        }

        // Clean old tokens
        refreshTokenRepository.deleteByUser(user);

        // Activate user if first-time verification
        if (!user.getIsActive()) {
            user.setIsActive(true);
            userRepository.save(user);
            log.info("Activated user account: {}", email);
        }

        String accessToken = jwtProvider.generateAccessToken(user.getEmail(), user.getRole());
        String refresh = jwtProvider.generateRefreshToken(user.getEmail());

        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .user(user)
                .token(refresh)
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .build();
        refreshTokenRepository.save(refreshTokenEntity);

        auditService.logAuthEvent(email, "OTP_VERIFIED", "User authenticated successfully");

        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refresh)
                .expiresIn(jwtProvider.getAccessTokenExpirationMs() / 1000)
                .requiresOtp(false)
                .user(user)
                .build();
    }

    @Transactional
    public TokenResponse refresh(RefreshRequest request) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new BadRequestException("Invalid refresh token"));

        if (refreshToken.getExpiresAt().isBefore(Instant.now())) {
            refreshTokenRepository.delete(refreshToken);
            auditService.logAuthEvent("unknown", "REFRESH_FAILED", "Expired refresh token");
            throw new BadRequestException("Expired refresh token. Please login again.");
        }

        User user = refreshToken.getUser();
        String newAccessToken = jwtProvider.generateAccessToken(user.getEmail(), user.getRole());
        String newRefreshToken = jwtProvider.generateRefreshToken(user.getEmail());

        // Rotate: invalidate old token, issue new one
        refreshTokenRepository.delete(refreshToken);

        RefreshToken newToken = RefreshToken.builder()
                .user(user)
                .token(newRefreshToken)
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .build();
        refreshTokenRepository.save(newToken);

        auditService.logAuthEvent(user.getEmail(), "TOKEN_REFRESHED", "Token rotated successfully");

        return TokenResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .expiresIn(jwtProvider.getAccessTokenExpirationMs() / 1000)
                .user(user)
                .build();
    }

    @Transactional
    public void logout(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                if (jwtProvider.validateToken(token)) {
                    String email = jwtProvider.getEmailFromToken(token);
                    userRepository.findByEmail(email).ifPresent(user -> {
                        refreshTokenRepository.deleteByUser(user);
                        auditService.logAuthEvent(email, "LOGOUT", "User logged out");
                        log.info("Logged out user: {}", email);
                    });
                }
            } catch (Exception e) {
                log.warn("Logout with invalid token attempted: {}", e.getMessage());
            }
        }
    }

    // ─── Password Reset ───────────────────────────────────────────────

    @Transactional
    public void requestPasswordReset(PasswordResetRequest request) {
        String email = request.getEmail().toLowerCase().trim();

        userRepository.findByEmail(email).ifPresentOrElse(user -> {
            // Invalidate any existing reset tokens
            passwordResetTokenRepository.deleteByUser(user);

            String rawToken = UUID.randomUUID().toString() + "-" + UUID.randomUUID().toString();
            String tokenHash = PasswordResetToken.hashToken(rawToken);

            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .user(user)
                    .tokenHash(tokenHash)
                    .expiresAt(Instant.now().plus(passwordResetTokenExpiryMinutes, ChronoUnit.MINUTES))
                    .used(false)
                    .build();

            passwordResetTokenRepository.save(resetToken);

            emailService.sendPasswordResetEmail(email, rawToken);
            auditService.logAuthEvent(email, "PASSWORD_RESET_REQUESTED", "Password reset email sent");
            log.info("Password reset requested for: {}", email);
        }, () -> {
            // Don't reveal whether the email exists
            log.info("Password reset requested for non-existent email: {}", email);
        });
    }

    @Transactional
    public void confirmPasswordReset(ConfirmPasswordResetRequest request) {
        if (request.getNewPassword() == null || request.getNewPassword().length() < 8) {
            throw new BadRequestException("New password must be at least 8 characters long");
        }

        String tokenHash = PasswordResetToken.hashToken(request.getToken());

        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new BadRequestException("Invalid or expired reset token"));

        if (resetToken.getUsed()) {
            throw new BadRequestException("Reset token has already been used");
        }

        if (resetToken.getExpiresAt().isBefore(Instant.now())) {
            passwordResetTokenRepository.delete(resetToken);
            throw new BadRequestException("Reset token has expired. Please request a new one.");
        }

        User user = resetToken.getUser();
        String newHash = passwordEncoder.encode(request.getNewPassword());

        // Prevent reusing the same password
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new BadRequestException("New password must be different from current password");
        }

        user.setPasswordHash(newHash);
        user.setLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        // Invalidate the token
        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        // Invalidate all sessions
        refreshTokenRepository.deleteByUser(user);

        auditService.logAuthEvent(user.getEmail(), "PASSWORD_RESET_COMPLETED", "Password reset successfully");
        log.info("Password reset completed for: {}", user.getEmail());
    }

    public StatsResponse getPublicStats() {
        long totalUsers = userRepository.count();
        BigDecimal totalBalances = walletRepository.sumAllBalances();
        return StatsResponse.builder()
                .totalUsers(totalUsers)
                .totalBalances(totalBalances != null ? totalBalances : BigDecimal.ZERO)
                .build();
    }
}
