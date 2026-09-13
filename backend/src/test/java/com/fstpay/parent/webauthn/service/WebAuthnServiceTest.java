package com.fstpay.parent.webauthn.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fstpay.common.exception.BadRequestException;
import com.fstpay.parent.webauthn.dto.*;
import com.fstpay.parent.webauthn.entity.UserWebAuthnCredential;
import com.fstpay.parent.webauthn.repository.UserWebAuthnCredentialRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WebAuthnServiceTest {

    @Mock
    private UserWebAuthnCredentialRepository credentialRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    private WebAuthnService webAuthnService;
    private ObjectMapper objectMapper;
    private User parent;

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

        parent = User.builder()
                .id(UUID.randomUUID())
                .email("parent@example.com")
                .fullName("John Guardian")
                .role("PARENT")
                .biometricEnabled(false)
                .build();
    }

    @Test
    void generateRegistrationOptions_CreatesValidOptionsAndStoresChallenge() {
        WebAuthnRegistrationOptions options = webAuthnService.generateRegistrationOptions(parent);

        assertNotNull(options.getChallenge());
        assertFalse(options.getChallenge().isBlank());
        assertEquals("FST Pay", options.getRp().getName());
        assertEquals("localhost", options.getRp().getId());
        assertEquals("parent@example.com", options.getUser().getName());
        assertEquals(2, options.getPubKeyCredParams().size());

        verify(valueOperations, times(1)).set(
                eq("fstpay:webauthn:reg:" + parent.getId()),
                eq(options.getChallenge()),
                any()
        );
    }

    @Test
    void verifyRegistration_ValidChallenge_SavesCredentialAndEnablesBiometrics() {
        String challenge = "test-reg-challenge-123";
        when(valueOperations.get("fstpay:webauthn:reg:" + parent.getId())).thenReturn(challenge);
        when(credentialRepository.findByCredentialId("cred-id-1")).thenReturn(Optional.empty());
        when(credentialRepository.save(any(UserWebAuthnCredential.class))).thenAnswer(i -> {
            UserWebAuthnCredential c = i.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        WebAuthnRegisterRequest request = WebAuthnRegisterRequest.builder()
                .credentialId("cred-id-1")
                .publicKey("MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...")
                .algorithm("ES256")
                .deviceName("Touch ID")
                .clientDataJSON("{\"type\":\"webauthn.create\",\"challenge\":\"test-reg-challenge-123\"}")
                .build();

        UserWebAuthnCredential saved = webAuthnService.verifyRegistration(parent, request);

        assertNotNull(saved);
        assertEquals("cred-id-1", saved.getCredentialId());
        assertEquals("Touch ID", saved.getDeviceName());
        assertTrue(parent.getBiometricEnabled());
        verify(userRepository, times(1)).save(parent);
        verify(redisTemplate, times(1)).delete("fstpay:webauthn:reg:" + parent.getId());
    }

    @Test
    void verifyRegistration_DuplicateCredentialId_ThrowsBadRequest() {
        when(valueOperations.get("fstpay:webauthn:reg:" + parent.getId())).thenReturn("valid-challenge");
        when(credentialRepository.findByCredentialId("cred-id-1")).thenReturn(
                Optional.of(UserWebAuthnCredential.builder().credentialId("cred-id-1").build())
        );

        WebAuthnRegisterRequest request = WebAuthnRegisterRequest.builder()
                .credentialId("cred-id-1")
                .publicKey("pubkey")
                .build();

        assertThrows(BadRequestException.class, () -> webAuthnService.verifyRegistration(parent, request));
    }

    @Test
    void generateApprovalChallenge_NoCredentials_ThrowsBadRequest() {
        UUID approvalId = UUID.randomUUID();
        when(credentialRepository.findByUserIdOrderByCreatedAtDesc(parent.getId())).thenReturn(Collections.emptyList());

        assertThrows(BadRequestException.class,
                () -> webAuthnService.generateApprovalChallenge(parent, approvalId));
    }

    @Test
    void generateApprovalChallenge_EnrolledParent_ReturnsChallengeWithAllowedCredentials() {
        UUID approvalId = UUID.randomUUID();
        UserWebAuthnCredential cred = UserWebAuthnCredential.builder()
                .id(UUID.randomUUID())
                .credentialId("cred-passkey-xyz")
                .build();
        when(credentialRepository.findByUserIdOrderByCreatedAtDesc(parent.getId())).thenReturn(List.of(cred));

        WebAuthnAuthenticationOptions options = webAuthnService.generateApprovalChallenge(parent, approvalId);

        assertNotNull(options.getChallenge());
        assertEquals(1, options.getAllowCredentials().size());
        assertEquals("cred-passkey-xyz", options.getAllowCredentials().get(0).getId());
        verify(valueOperations, times(1)).set(
                eq("fstpay:webauthn:auth:" + parent.getId() + ":" + approvalId),
                eq(options.getChallenge()),
                any()
        );
    }

    @Test
    void verifyBiometricAssertion_ValidAssertion_SucceedsAndIncrementsCount() {
        UUID approvalId = UUID.randomUUID();
        String challenge = "challenge-auth-789";
        when(valueOperations.get("fstpay:webauthn:auth:" + parent.getId() + ":" + approvalId)).thenReturn(challenge);

        UserWebAuthnCredential cred = UserWebAuthnCredential.builder()
                .id(UUID.randomUUID())
                .user(parent)
                .credentialId("cred-passkey-xyz")
                .signCount(5L)
                .publicKey("pubkey")
                .algorithm("ES256")
                .build();
        when(credentialRepository.findByCredentialId("cred-passkey-xyz")).thenReturn(Optional.of(cred));

        boolean verified = webAuthnService.verifyBiometricAssertion(
                parent,
                approvalId,
                "cred-passkey-xyz",
                "{\"type\":\"webauthn.get\",\"challenge\":\"challenge-auth-789\"}",
                "authdata-bytes",
                "mock-passkey-sig-abc"
        );

        assertTrue(verified);
        assertEquals(6L, cred.getSignCount());
        assertNotNull(cred.getLastUsedAt());
        verify(credentialRepository, times(1)).save(cred);
        verify(redisTemplate, times(1)).delete("fstpay:webauthn:auth:" + parent.getId() + ":" + approvalId);
    }

    @Test
    void verifyBiometricAssertion_ExpiredChallenge_ThrowsBadRequest() {
        UUID approvalId = UUID.randomUUID();
        when(valueOperations.get("fstpay:webauthn:auth:" + parent.getId() + ":" + approvalId)).thenReturn(null);

        assertThrows(BadRequestException.class, () -> webAuthnService.verifyBiometricAssertion(
                parent, approvalId, "cred-passkey-xyz", "clientData", "authData", "mock-passkey-sig-abc"
        ));
    }

    @Test
    void deleteCredential_RemovesCredentialAndUpdatesBiometricsFlagWhenZeroLeft() {
        UUID credId = UUID.randomUUID();
        when(credentialRepository.countByUserId(parent.getId())).thenReturn(0L);

        webAuthnService.deleteCredential(parent, credId);

        verify(credentialRepository, times(1)).deleteByUserIdAndId(parent.getId(), credId);
        assertFalse(parent.getBiometricEnabled());
        verify(userRepository, times(1)).save(parent);
    }
}
