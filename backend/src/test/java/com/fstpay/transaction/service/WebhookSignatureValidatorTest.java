package com.fstpay.transaction.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class WebhookSignatureValidatorTest {

    private WebhookSignatureValidator validator;
    private final String secret = "test_webhook_secret_key_1234567890123456";

    @BeforeEach
    void setUp() {
        validator = new WebhookSignatureValidator(secret);
    }

    @Test
    void testValidSignature_ReturnsTrue() {
        String payload = "TXN_REF_100:500.00:SETTLED";
        String signature = validator.computeSignature(payload);

        assertTrue(validator.isValidSignature(payload, signature));
    }

    @Test
    void testInvalidSignature_ReturnsFalse() {
        String payload = "TXN_REF_100:500.00:SETTLED";
        String badSignature = "deadbeef1234567890abcdefdeadbeef";

        assertFalse(validator.isValidSignature(payload, badSignature));
    }

    @Test
    void testTamperedPayload_ReturnsFalse() {
        String originalPayload = "TXN_REF_100:500.00:SETTLED";
        String signature = validator.computeSignature(originalPayload);

        String tamperedPayload = "TXN_REF_100:9999.00:SETTLED";
        assertFalse(validator.isValidSignature(tamperedPayload, signature));
    }

    @Test
    void testNullOrBlankInputs_ReturnsFalse() {
        assertFalse(validator.isValidSignature(null, "some_sig"));
        assertFalse(validator.isValidSignature("payload", null));
        assertFalse(validator.isValidSignature("payload", "   "));
    }
}
