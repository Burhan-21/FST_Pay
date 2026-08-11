package com.fstpay.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

@Slf4j
@Service
public class RecaptchaService {

    @Value("${google.recaptcha.secret:}")
    private String recaptchaSecret;

    private final org.springframework.core.env.Environment env;
    private final RestTemplate restTemplate = new RestTemplate();

    public RecaptchaService(org.springframework.core.env.Environment env) {
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

    public boolean verifyToken(String token) {
        // In production profile, secret key MUST be explicitly configured
        if (isProdEnvironment() && (recaptchaSecret == null || recaptchaSecret.trim().isEmpty())) {
            log.error("reCAPTCHA secret key must be configured in production environment!");
            return false;
        }

        // Allow bypass only if secret is not configured in dev/test environment
        if (recaptchaSecret == null || recaptchaSecret.trim().isEmpty()) {
            log.warn("reCAPTCHA secret not configured — allowing request without verification (non-prod)");
            return true;
        }

        if (token == null || token.trim().isEmpty()) {
            log.warn("reCAPTCHA token is empty or null");
            return false;
        }

        String url = "https://www.google.com/recaptcha/api/siteverify";
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED);

        org.springframework.util.LinkedMultiValueMap<String, String> map = new org.springframework.util.LinkedMultiValueMap<>();
        map.add("secret", recaptchaSecret);
        map.add("response", token);

        org.springframework.http.HttpEntity<org.springframework.util.LinkedMultiValueMap<String, String>> request =
                new org.springframework.http.HttpEntity<>(map, headers);

        try {
            Map<String, Object> response = restTemplate.postForObject(url, request, Map.class);
            if (response != null && response.get("success") != null) {
                boolean success = (Boolean) response.get("success");
                if (!success) {
                    log.warn("reCAPTCHA validation failed");
                }
                return success;
            }
        } catch (Exception e) {
            log.error("Failed to verify reCAPTCHA token: {}", e.getMessage(), e);
        }
        return false;
    }
}
