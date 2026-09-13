package com.fstpay.transaction.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@Component
@Slf4j
public class WebhookSignatureValidator {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private final String webhookSecret;

    public WebhookSignatureValidator(
            @Value("${app.webhook.merchant.secret:fstpay_webhook_secret_key_prod_change_in_env_32bytes}") String webhookSecret
    ) {
        this.webhookSecret = webhookSecret;
    }

    /**
     * Validates HMAC-SHA256 signature against payload using constant-time comparison.
     *
     * @param payload   The raw payload string or canonical string representation
     * @param signature The expected hex-encoded signature from X-Webhook-Signature header
     * @return true if valid, false otherwise
     */
    public boolean isValidSignature(String payload, String signature) {
        if (payload == null || signature == null || signature.isBlank()) {
            log.warn("Webhook validation rejected: missing payload or signature header");
            return false;
        }

        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                    webhookSecret.getBytes(StandardCharsets.UTF_8),
                    HMAC_ALGORITHM
            );
            mac.init(secretKeySpec);

            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String calculatedHex = HexFormat.of().formatHex(hash);

            // Constant-time byte array comparison prevents timing attack vulnerabilities
            boolean matches = MessageDigest.isEqual(
                    calculatedHex.getBytes(StandardCharsets.UTF_8),
                    signature.trim().toLowerCase().getBytes(StandardCharsets.UTF_8)
            );

            if (!matches) {
                log.warn("Webhook signature mismatch detected");
            }
            return matches;
        } catch (Exception e) {
            log.error("Failed to compute webhook HMAC signature", e);
            return false;
        }
    }

    /**
     * Helper to compute signature for testing and mock gateway integration.
     */
    public String computeSignature(String payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                    webhookSecret.getBytes(StandardCharsets.UTF_8),
                    HMAC_ALGORITHM
            );
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to compute HMAC signature", e);
        }
    }
}
