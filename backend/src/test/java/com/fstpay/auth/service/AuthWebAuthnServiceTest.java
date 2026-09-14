package com.fstpay.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fstpay.auth.dto.TokenResponse;
import com.fstpay.auth.dto.WebAuthnLoginRequest;
import com.fstpay.auth.entity.RefreshToken;
import com.fstpay.auth.repository.PasswordResetTokenRepository;
import com.fstpay.auth.repository.RefreshTokenRepository;
import com.fstpay.auth.security.JwtProvider;
import com.fstpay.auth.totp.TotpService;
import com.fstpay.auth.totp.repository.UserBackupCodeRepository;
import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.service.AuditService;
import com.fstpay.notification.service.EmailService;
import com.fstpay.parent.webauthn.dto.WebAuthnAuthenticationOptions;
import com.fstpay.parent.webauthn.entity.UserWebAuthnCredential;
import com.fstpay.parent.webauthn.repository.UserWebAuthnCredentialRepository;
import com.fstpay.parent.webauthn.service.WebAuthnService;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.repository.WalletRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthWebAuthnServiceTest {

    @Mock
    private UserWebAuthnCredentialRepository credentialRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private WalletRepository walletRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtProvider jwtProvider;
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
    @Mock
    private TotpService totpService;
    @Mock
    private UserBackupCodeRepository userBackupCodeRepository;

    private WebAuthnService webAuthnService;
    private AuthService authService;
    private ObjectMapper objectMapper;
    private User testUser;
    private UserWebAuthnCredential testCredential;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        webAuthnService = new WebAuthnService(
                credentialRepository,
                userRepository,
                Optional.of(redisTemplate),
                objectMapper
        );
        ReflectionTestUtils.setField(webAuthnService, "rpId", "localhost");
        ReflectionTestUtils.setField(webAuthnService, "rpName", "FST Pay");

        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        authService = new AuthService(
                userRepository,
                walletRepository,
                refreshTokenRepository,
                passwordResetTokenRepository,
                passwordEncoder,
                jwtProvider,
                otpService,
                emailService,
                recaptchaService,
                auditService,
                entityManager,
                totpService,
                userBackupCodeRepository,
                webAuthnService
        );
        ReflectionTestUtils.setField(authService, "maxLoginAttempts", 5);
        ReflectionTestUtils.setField(authService, "lockoutDurationMinutes", 15L);

        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("alex@example.com")
                .fullName("Alex Rivera")
                .role("USER")
                .isActive(true)
                .biometricEnabled(true)
                .loginAttempts(0)
                .build();

        testCredential = UserWebAuthnCredential.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .credentialId("cred-test-passkey-100")
                .publicKey("MHYwEAYHKoZIzj0CAQYFK4EEACIDYgA...")
                .algorithm("ES256")
                .deviceName("Touch ID MacBook")
                .signCount(10L)
                .createdAt(Instant.now().minus(5, ChronoUnit.DAYS))
                .lastUsedAt(Instant.now().minus(1, ChronoUnit.DAYS))
                .build();
    }

    @Test
    void generateLoginChallenge_WithoutEmail_ReturnsOptionsWithEmptyAllowCredentials() {
        WebAuthnAuthenticationOptions options = webAuthnService.generateLoginChallenge(null);

        assertNotNull(options.getChallenge());
        assertFalse(options.getChallenge().isBlank());
        assertEquals("localhost", options.getRpId());
        assertTrue(options.getAllowCredentials().isEmpty());

        verify(valueOperations, times(1)).set(
                eq("fstpay:webauthn:login:" + options.getChallenge()),
                eq(options.getChallenge()),
                any()
        );
    }

    @Test
    void generateLoginChallenge_WithEmail_PopulatesAllowCredentials() {
        when(userRepository.findByEmail("alex@example.com")).thenReturn(Optional.of(testUser));
        when(credentialRepository.findByUserIdOrderByCreatedAtDesc(testUser.getId()))
                .thenReturn(List.of(testCredential));

        WebAuthnAuthenticationOptions options = webAuthnService.generateLoginChallenge("alex@example.com");

        assertNotNull(options.getChallenge());
        assertEquals(1, options.getAllowCredentials().size());
        assertEquals("cred-test-passkey-100", options.getAllowCredentials().get(0).getId());
    }

    @Test
    void verifyLoginAssertion_ValidAssertion_ReturnsUser() {
        String challenge = "valid-login-challenge-xyz";
        when(credentialRepository.findByCredentialId("cred-test-passkey-100")).thenReturn(Optional.of(testCredential));
        when(valueOperations.get("fstpay:webauthn:login:" + challenge)).thenReturn(challenge);

        String clientDataJSON = Base64.getUrlEncoder().withoutPadding().encodeToString(
                ("{\"type\":\"webauthn.get\",\"challenge\":\"" + challenge + "\",\"origin\":\"http://localhost:5173\"}").getBytes()
        );

        WebAuthnLoginRequest request = WebAuthnLoginRequest.builder()
                .credentialId("cred-test-passkey-100")
                .clientDataJSON(clientDataJSON)
                .authenticatorData(Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[37]))
                .signature("mock-passkey-sig-valid-assertion")
                .build();

        User authenticated = webAuthnService.verifyLoginAssertion(request);

        assertNotNull(authenticated);
        assertEquals("alex@example.com", authenticated.getEmail());
        assertEquals(11L, testCredential.getSignCount());
        verify(credentialRepository, times(1)).save(testCredential);
        verify(redisTemplate, times(1)).delete("fstpay:webauthn:login:" + challenge);
    }

    @Test
    void verifyLoginAssertion_UnknownCredential_ThrowsBadRequest() {
        when(credentialRepository.findByCredentialId("unknown-cred")).thenReturn(Optional.empty());

        WebAuthnLoginRequest request = WebAuthnLoginRequest.builder()
                .credentialId("unknown-cred")
                .clientDataJSON("{\"challenge\":\"xyz\"}")
                .authenticatorData("authData")
                .signature("mock-passkey-sig-1")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> webAuthnService.verifyLoginAssertion(request));
        assertTrue(ex.getMessage().contains("Passkey credential not recognized"));
    }

    @Test
    void verifyLoginAssertion_ExpiredChallenge_ThrowsBadRequest() {
        when(credentialRepository.findByCredentialId("cred-test-passkey-100")).thenReturn(Optional.of(testCredential));

        String clientDataJSON = Base64.getUrlEncoder().withoutPadding().encodeToString(
                ("{\"type\":\"webauthn.get\",\"challenge\":\"expired-challenge\",\"origin\":\"http://localhost\"}").getBytes()
        );

        when(valueOperations.get("fstpay:webauthn:login:expired-challenge")).thenReturn(null);

        WebAuthnLoginRequest request = WebAuthnLoginRequest.builder()
                .credentialId("cred-test-passkey-100")
                .clientDataJSON(clientDataJSON)
                .authenticatorData("authData")
                .signature("mock-passkey-sig-1")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> webAuthnService.verifyLoginAssertion(request));
        assertTrue(ex.getMessage().contains("challenge expired or invalid"));
    }

    @Test
    void loginWithWebAuthn_ValidAssertion_ReturnsTokenResponse() {
        String challenge = "challenge-abc";
        when(credentialRepository.findByCredentialId("cred-test-passkey-100")).thenReturn(Optional.of(testCredential));
        when(valueOperations.get("fstpay:webauthn:login:" + challenge)).thenReturn(challenge);
        when(jwtProvider.generateAccessToken(eq("alex@example.com"), eq("USER"))).thenReturn("mock-access-jwt");
        when(jwtProvider.generateRefreshToken(eq("alex@example.com"))).thenReturn("mock-refresh-jwt");
        when(jwtProvider.getAccessTokenExpirationMs()).thenReturn(900000L);

        String clientDataJSON = Base64.getUrlEncoder().withoutPadding().encodeToString(
                ("{\"type\":\"webauthn.get\",\"challenge\":\"" + challenge + "\"}").getBytes()
        );

        WebAuthnLoginRequest request = WebAuthnLoginRequest.builder()
                .credentialId("cred-test-passkey-100")
                .clientDataJSON(clientDataJSON)
                .authenticatorData("authData")
                .signature("mock-passkey-sig-1")
                .build();

        TokenResponse tokenResponse = authService.loginWithWebAuthn(request);

        assertNotNull(tokenResponse);
        assertEquals("mock-access-jwt", tokenResponse.getAccessToken());
        assertEquals("mock-refresh-jwt", tokenResponse.getRefreshToken());
        assertFalse(tokenResponse.getRequiresOtp());
        assertFalse(tokenResponse.getRequiresTotp());
        verify(auditService, times(1)).logAuthEvent(eq("alex@example.com"), eq("WEBAUTHN_LOGIN_SUCCESS"), any());
        verify(refreshTokenRepository, times(1)).save(any(RefreshToken.class));
    }

    @Test
    void loginWithWebAuthn_LockedAccount_ThrowsBadRequest() {
        testUser.setLoginAttempts(5);
        testUser.setLockedUntil(Instant.now().plus(10, ChronoUnit.MINUTES));

        String challenge = "challenge-locked";
        when(credentialRepository.findByCredentialId("cred-test-passkey-100")).thenReturn(Optional.of(testCredential));
        when(valueOperations.get("fstpay:webauthn:login:" + challenge)).thenReturn(challenge);

        String clientDataJSON = Base64.getUrlEncoder().withoutPadding().encodeToString(
                ("{\"type\":\"webauthn.get\",\"challenge\":\"" + challenge + "\"}").getBytes()
        );

        WebAuthnLoginRequest request = WebAuthnLoginRequest.builder()
                .credentialId("cred-test-passkey-100")
                .clientDataJSON(clientDataJSON)
                .authenticatorData("authData")
                .signature("mock-passkey-sig-1")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> authService.loginWithWebAuthn(request));
        assertTrue(ex.getMessage().contains("Account locked"));
    }
}
