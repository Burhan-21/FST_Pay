package com.fstpay.auth.totp;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Slf4j
@Service
public class TotpService {

    private static final int TIME_STEP_SECONDS = 30;
    private static final int CODE_DIGITS = 6;
    private static final int SECRET_BYTES = 20; // 160 bits
    private static final int BACKUP_CODES_COUNT = 8;
    private static final String BACKUP_CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

    private final SecureRandom secureRandom = new SecureRandom();
    private final MeterRegistry meterRegistry;

    @Autowired
    public TotpService(@Autowired(required = false) MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    /**
     * Generate a new cryptographically random Base32 secret for TOTP enrollment.
     */
    public String generateSecret() {
        byte[] bytes = new byte[SECRET_BYTES];
        secureRandom.nextBytes(bytes);
        return Base32.encode(bytes);
    }

    /**
     * Compute 6-digit TOTP code for a given Base32 secret and time step.
     */
    public String generateCode(String base32Secret, long timeStep) {
        try {
            byte[] keyBytes = Base32.decode(base32Secret);
            byte[] data = ByteBuffer.allocate(8).putLong(timeStep).array();

            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(keyBytes, "HmacSHA1"));
            byte[] hash = mac.doFinal(data);

            int offset = hash[hash.length - 1] & 0x0f;
            int binary = ((hash[offset] & 0x7f) << 24)
                    | ((hash[offset + 1] & 0xff) << 16)
                    | ((hash[offset + 2] & 0xff) << 8)
                    | (hash[offset + 3] & 0xff);

            int otp = binary % (int) Math.pow(10, CODE_DIGITS);
            return String.format("%0" + CODE_DIGITS + "d", otp);
        } catch (Exception e) {
            log.error("Error generating TOTP code: {}", e.getMessage());
            throw new IllegalStateException("Failed to calculate TOTP code", e);
        }
    }

    /**
     * Verify a 6-digit code with +/- 1 time step window for clock skew tolerance.
     */
    public boolean verifyCode(String base32Secret, String userCode) {
        if (base32Secret == null || userCode == null || userCode.trim().length() != CODE_DIGITS) {
            recordAttempt("invalid_format");
            return false;
        }

        String cleanedCode = userCode.trim();
        long currentStep = System.currentTimeMillis() / 1000 / TIME_STEP_SECONDS;

        for (int i = -1; i <= 1; i++) {
            String stepCode = generateCode(base32Secret, currentStep + i);
            if (MessageDigest.isEqual(stepCode.getBytes(StandardCharsets.UTF_8), cleanedCode.getBytes(StandardCharsets.UTF_8))) {
                recordAttempt("success");
                return true;
            }
        }

        recordAttempt("invalid_code");
        return false;
    }

    /**
     * Generate standard otpauth:// URI for Authenticator apps.
     */
    public String generateOtpauthUrl(String email, String secret) {
        String issuer = "FST Pay";
        String encodedEmail = URLEncoder.encode(email, StandardCharsets.UTF_8).replace("+", "%20");
        String encodedIssuer = URLEncoder.encode(issuer, StandardCharsets.UTF_8).replace("+", "%20");
        return String.format("otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=%d&period=%d",
                encodedIssuer, encodedEmail, secret, encodedIssuer, CODE_DIGITS, TIME_STEP_SECONDS);
    }

    /**
     * Generate PNG Data URI for QR code scanning using ZXing.
     */
    public String generateQrCodeDataUri(String otpauthUrl) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(otpauthUrl, BarcodeFormat.QR_CODE, 220, 220);
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            String base64Png = Base64.getEncoder().encodeToString(outputStream.toByteArray());
            return "data:image/png;base64," + base64Png;
        } catch (Exception e) {
            log.error("Failed to generate QR code data URI: {}", e.getMessage());
            return "";
        }
    }

    /**
     * Generate 8 single-use emergency recovery backup codes formatted XXXX-XXXX.
     */
    public List<String> generateBackupCodes() {
        List<String> codes = new ArrayList<>(BACKUP_CODES_COUNT);
        for (int i = 0; i < BACKUP_CODES_COUNT; i++) {
            StringBuilder sb = new StringBuilder(9);
            for (int j = 0; j < 8; j++) {
                if (j == 4) {
                    sb.append('-');
                }
                int idx = secureRandom.nextInt(BACKUP_CODE_CHARS.length());
                sb.append(BACKUP_CODE_CHARS.charAt(idx));
            }
            codes.add(sb.toString());
        }
        return codes;
    }

    /**
     * Hash single-use backup code with SHA-256 for secure storage.
     */
    public String hashBackupCode(String code) {
        if (code == null) {
            return "";
        }
        String normalized = code.replaceAll("[\\s-]", "").toUpperCase();
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(normalized.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 digest unavailable", e);
        }
    }

    private void recordAttempt(String status) {
        if (meterRegistry != null) {
            Counter.builder("fstpay.mfa.totp.attempts.total")
                    .tag("status", status)
                    .description("Total number of TOTP verification attempts")
                    .register(meterRegistry)
                    .increment();
        }
    }

    public void recordBackupCodeUsed(boolean success) {
        if (meterRegistry != null) {
            Counter.builder("fstpay.mfa.backup_code.used.total")
                    .tag("status", success ? "success" : "invalid_code")
                    .description("Total number of emergency recovery backup code redemptions")
                    .register(meterRegistry)
                    .increment();
        }
    }
}
