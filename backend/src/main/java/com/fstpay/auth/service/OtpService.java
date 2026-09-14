package com.fstpay.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import java.security.SecureRandom;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class OtpService {

    private static final long OTP_RATE_LIMIT_SECONDS = 60;

    private final StringRedisTemplate redisTemplate;
    private final org.springframework.core.env.Environment env;
    // Fallback in case Redis is not connected / active
    private final ConcurrentHashMap<String, String> localOtpCache = new ConcurrentHashMap<>();
    // Rate limit tracking: email -> last OTP sent timestamp
    private final ConcurrentHashMap<String, Long> otpRateLimit = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "otp-cleanup");
        t.setDaemon(true);
        return t;
    });

    @Value("${app.auth.otp-rate-limit-seconds:60}")
    private long otpRateLimitSeconds;

    public OtpService(@org.springframework.beans.factory.annotation.Autowired(required = false) StringRedisTemplate redisTemplate, org.springframework.core.env.Environment env) {
        this.redisTemplate = redisTemplate;
        this.env = env;
    }

    private boolean isProdEnvironment() {
        if (env != null && env.getActiveProfiles() != null) {
            for (String profile : env.getActiveProfiles()) {
                if ("prod".equalsIgnoreCase(profile) || "production".equalsIgnoreCase(profile)) {
                    return true;
                }
            }
        }
        return false;
    }

    public String forceGenerateOtp(String email) {
        otpRateLimit.remove(email);
        return generateOtp(email);
    }

    public String generateOtp(String email) {
        // Rate limit OTP generation
        Long lastSent = otpRateLimit.get(email);
        long now = System.currentTimeMillis();
        if (lastSent != null && (now - lastSent) < otpRateLimitSeconds * 1000) {
            long remaining = otpRateLimitSeconds - ((now - lastSent) / 1000);
            log.warn("OTP rate limited for {}: try again in {}s", email, remaining);
            return null; // Caller handles null
        }

        String otp = String.format("%06d", random.nextInt(1000000));
        // Strict production profile security isolation: deterministic test OTP only allowed in non-prod profiles
        if (!isProdEnvironment()) {
            if ("burhan.test1@gmail.com".equalsIgnoreCase(email) || "burhan.parent1@gmail.com".equalsIgnoreCase(email)
                    || "admin@fstpay.com".equalsIgnoreCase(email) || "burhan.mulla21@gmail.com".equalsIgnoreCase(email)
                    || email.toLowerCase().endsWith("@fstpay.com")) {
                otp = "123456";
            }
            log.info("[DEV] OTP generated for {}: {}", email, otp);
        }

        if (redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set("otp:" + email, otp, 5, TimeUnit.MINUTES);
            } catch (Exception e) {
                log.warn("Redis not available. Saving OTP to local map: {}", e.getMessage());
                localOtpCache.put(email, otp);
                scheduler.schedule(() -> localOtpCache.remove(email), 5, TimeUnit.MINUTES);
            }
        } else {
            localOtpCache.put(email, otp);
            scheduler.schedule(() -> localOtpCache.remove(email), 5, TimeUnit.MINUTES);
        }

        otpRateLimit.put(email, now);

        log.info("OTP generated for: {}", email);
        return otp;
    }

    public boolean verifyOtp(String email, String otp) {
        String storedOtp = null;
        if (redisTemplate != null) {
            try {
                storedOtp = redisTemplate.opsForValue().get("otp:" + email);
            } catch (Exception e) {
                log.warn("Redis not available for OTP read. Checking local map: {}", e.getMessage());
            }
        }

        if (storedOtp == null) {
            storedOtp = localOtpCache.get(email);
        }

        if (storedOtp != null && storedOtp.equals(otp)) {
            if (redisTemplate != null) {
                try {
                    redisTemplate.delete("otp:" + email);
                } catch (Exception e) {
                    // ignore
                }
            }
            localOtpCache.remove(email);
            otpRateLimit.remove(email);
            return true;
        }
        return false;
    }
}
