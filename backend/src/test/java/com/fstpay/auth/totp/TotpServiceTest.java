package com.fstpay.auth.totp;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TotpServiceTest {

    private TotpService totpService;
    private SimpleMeterRegistry meterRegistry;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        totpService = new TotpService(meterRegistry);
    }

    @Test
    void testBase32Roundtrip() {
        String testString = "Hello, FST Pay 2FA!";
        byte[] originalBytes = testString.getBytes(StandardCharsets.UTF_8);

        String encoded = Base32.encode(originalBytes);
        assertNotNull(encoded);
        assertFalse(encoded.isEmpty());

        byte[] decoded = Base32.decode(encoded);
        assertArrayEquals(originalBytes, decoded);
    }

    @Test
    void testBase32Rfc4648Vectors() {
        assertEquals("", Base32.encode("".getBytes(StandardCharsets.UTF_8)));
        assertEquals("MY", Base32.encode("f".getBytes(StandardCharsets.UTF_8)));
        assertEquals("MZXQ", Base32.encode("fo".getBytes(StandardCharsets.UTF_8)));
        assertEquals("MZXW6", Base32.encode("foo".getBytes(StandardCharsets.UTF_8)));
        assertEquals("MZXW6YQ", Base32.encode("foob".getBytes(StandardCharsets.UTF_8)));
        assertEquals("MZXW6YTBOI", Base32.encode("foobar".getBytes(StandardCharsets.UTF_8)));

        assertArrayEquals("foobar".getBytes(StandardCharsets.UTF_8), Base32.decode("MZXW6YTBOI"));
        assertArrayEquals("foobar".getBytes(StandardCharsets.UTF_8), Base32.decode("mzxw6ytboi"));
        assertArrayEquals("foobar".getBytes(StandardCharsets.UTF_8), Base32.decode("MZXW-6YTB-OI=="));
    }

    @Test
    void testGenerateSecret() {
        String secret = totpService.generateSecret();
        assertNotNull(secret);
        assertEquals(32, secret.length());
        // Verify it can be decoded without error
        byte[] decoded = Base32.decode(secret);
        assertEquals(20, decoded.length);
    }

    @Test
    void testGenerateAndVerifyCode() {
        String secret = totpService.generateSecret();
        long currentStep = System.currentTimeMillis() / 1000 / 30;

        String code = totpService.generateCode(secret, currentStep);
        assertNotNull(code);
        assertEquals(6, code.length());
        assertTrue(code.matches("^[0-9]{6}$"));

        // Current step should verify
        assertTrue(totpService.verifyCode(secret, code));

        // Invalid code should fail
        assertFalse(totpService.verifyCode(secret, "000000".equals(code) ? "111111" : "000000"));
        assertFalse(totpService.verifyCode(secret, "abc"));
        assertFalse(totpService.verifyCode(secret, null));
    }

    @Test
    void testOtpauthUrlAndQrCodeGeneration() {
        String secret = "JBSWY3DPEHPK3PXP";
        String email = "teen@fstpay.com";

        String otpauthUrl = totpService.generateOtpauthUrl(email, secret);
        assertTrue(otpauthUrl.startsWith("otpauth://totp/FST%20Pay:"));
        assertTrue(otpauthUrl.contains("secret=JBSWY3DPEHPK3PXP"));
        assertTrue(otpauthUrl.contains("digits=6"));

        String qrDataUri = totpService.generateQrCodeDataUri(otpauthUrl);
        assertNotNull(qrDataUri);
        assertTrue(qrDataUri.startsWith("data:image/png;base64,"));
        assertTrue(qrDataUri.length() > 100);
    }

    @Test
    void testBackupCodesGenerationAndHashing() {
        List<String> backupCodes = totpService.generateBackupCodes();
        assertEquals(8, backupCodes.size());

        for (String code : backupCodes) {
            assertTrue(code.matches("^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$"));
            String hash = totpService.hashBackupCode(code);
            assertEquals(64, hash.length()); // SHA-256 in hex
            // Case-insensitive & dash-insensitive hashing
            String lowerNoDash = code.replace("-", "").toLowerCase();
            assertEquals(hash, totpService.hashBackupCode(lowerNoDash));
        }
    }

    @Test
    void testMetricsRecorded() {
        String secret = totpService.generateSecret();
        totpService.verifyCode(secret, "123456");
        totpService.recordBackupCodeUsed(true);

        assertNotNull(meterRegistry.find("fstpay.mfa.totp.attempts.total").counter());
        assertNotNull(meterRegistry.find("fstpay.mfa.backup_code.used.total").counter());
    }
}
