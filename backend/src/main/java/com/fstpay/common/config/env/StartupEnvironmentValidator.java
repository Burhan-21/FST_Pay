package com.fstpay.common.config.env;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Startup environment validator that performs fail-fast verification of required
 * application properties and security parameters when starting non-test runtimes.
 */
@Component
@EnableConfigurationProperties(EnvironmentProperties.class)
@Slf4j
public class StartupEnvironmentValidator implements ApplicationListener<ApplicationReadyEvent> {

    private final Environment environment;
    private final EnvironmentProperties properties;

    public StartupEnvironmentValidator(Environment environment, EnvironmentProperties properties) {
        this.environment = environment;
        this.properties = properties;
    }

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        List<String> activeProfiles = Arrays.asList(environment.getActiveProfiles());

        // Skip strict validation during unit/integration test executions unless explicitly forced
        if (activeProfiles.contains(ApplicationProfiles.TEST)) {
            log.info("Test profile active — skipping strict startup environment property validation.");
            return;
        }

        boolean isProd = activeProfiles.contains(ApplicationProfiles.PROD);
        boolean isStrict = properties.strictValidationEnabled() || isProd;

        if (!isStrict) {
            log.info("Development environment detected — non-strict property validation mode.");
            return;
        }

        log.info("Executing fail-fast startup environment validation (Profile: {})...", activeProfiles);
        List<String> errors = new ArrayList<>();

        // 1. JWT Secret Validation
        String jwtSecret = environment.getProperty("jwt.secret");
        if (jwtSecret == null || jwtSecret.isBlank()) {
            errors.add("JWT_SECRET is missing or blank.");
        } else {
            if (jwtSecret.length() < properties.minJwtSecretLength()) {
                errors.add(String.format("JWT_SECRET is too short (%d chars). Minimum required length is %d.",
                        jwtSecret.length(), properties.minJwtSecretLength()));
            }
            for (String placeholder : properties.disallowedPlaceholders()) {
                if (jwtSecret.equalsIgnoreCase(placeholder.trim()) || jwtSecret.toLowerCase().contains(placeholder.toLowerCase().trim())) {
                    errors.add(String.format("JWT_SECRET contains prohibited placeholder string: '%s'.", placeholder));
                    break;
                }
            }
        }

        // 2. Database Connection URL Validation
        String dbUrl = environment.getProperty("spring.datasource.url");
        if (dbUrl == null || dbUrl.isBlank()) {
            errors.add("SPRING_DATASOURCE_URL is missing or blank.");
        } else if (!dbUrl.startsWith("jdbc:postgresql://") && !dbUrl.startsWith("jdbc:h2:")) {
            errors.add(String.format("SPRING_DATASOURCE_URL format invalid: '%s'. Expected 'jdbc:postgresql://...'", dbUrl));
        }

        // 3. CORS Allowed Origins Validation
        String corsOrigins = environment.getProperty("cors.allowed-origins");
        if (corsOrigins == null || corsOrigins.isBlank()) {
            errors.add("CORS_ALLOWED_ORIGINS is missing or blank.");
        } else if (isProd && corsOrigins.contains("*")) {
            errors.add("CORS_ALLOWED_ORIGINS must not contain wildcard '*' in production profile.");
        }

        // 4. Redis Host Validation
        String redisHost = environment.getProperty("spring.data.redis.host");
        if (redisHost == null || redisHost.isBlank()) {
            errors.add("SPRING_REDIS_HOST is missing or blank.");
        }

        // Evaluate validation result
        if (!errors.isEmpty()) {
            log.error("=================================================================");
            log.error("CRITICAL: STARTUP ENVIRONMENT VALIDATION FAILED (Errors: {})", errors.size());
            for (String err : errors) {
                log.error(" -> {}", err);
            }
            log.error("=================================================================");
            throw new IllegalStateException("Environment configuration validation failed: " + String.join("; ", errors));
        }

        log.info("Startup environment property validation PASSED successfully.");
    }
}
