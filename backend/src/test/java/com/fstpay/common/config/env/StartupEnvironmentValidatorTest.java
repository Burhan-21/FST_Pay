package com.fstpay.common.config.env;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.mock.env.MockEnvironment;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

class StartupEnvironmentValidatorTest {

    private MockEnvironment environment;
    private EnvironmentProperties properties;

    @BeforeEach
    void setUp() {
        environment = new MockEnvironment();
        properties = new EnvironmentProperties(
                true,
                32,
                List.of("changeme", "placeholder", "your_secret_here", "Admin@Secure123")
        );
    }

    @Test
    @DisplayName("Should skip validation when 'test' profile is active")
    void testProfileSkipsValidation() {
        environment.setActiveProfiles(ApplicationProfiles.TEST);
        StartupEnvironmentValidator validator = new StartupEnvironmentValidator(environment, properties);

        assertDoesNotThrow(() -> validator.onApplicationEvent(mock(ApplicationReadyEvent.class)));
    }

    @Test
    @DisplayName("Should fail validation when JWT_SECRET is missing")
    void missingJwtSecretThrowsException() {
        environment.setActiveProfiles(ApplicationProfiles.PROD);
        environment.setProperty("spring.datasource.url", "jdbc:postgresql://localhost:5432/fstpay");
        environment.setProperty("cors.allowed-origins", "https://fstpay.com");
        environment.setProperty("spring.data.redis.host", "localhost");

        StartupEnvironmentValidator validator = new StartupEnvironmentValidator(environment, properties);

        assertThrows(IllegalStateException.class, () -> validator.onApplicationEvent(mock(ApplicationReadyEvent.class)));
    }

    @Test
    @DisplayName("Should fail validation when JWT_SECRET is too short (< 32 characters)")
    void shortJwtSecretThrowsException() {
        environment.setActiveProfiles(ApplicationProfiles.PROD);
        environment.setProperty("jwt.secret", "shortSecret12345");
        environment.setProperty("spring.datasource.url", "jdbc:postgresql://localhost:5432/fstpay");
        environment.setProperty("cors.allowed-origins", "https://fstpay.com");
        environment.setProperty("spring.data.redis.host", "localhost");

        StartupEnvironmentValidator validator = new StartupEnvironmentValidator(environment, properties);

        assertThrows(IllegalStateException.class, () -> validator.onApplicationEvent(mock(ApplicationReadyEvent.class)));
    }

    @Test
    @DisplayName("Should fail validation when JWT_SECRET contains prohibited placeholder")
    void placeholderJwtSecretThrowsException() {
        environment.setActiveProfiles(ApplicationProfiles.PROD);
        environment.setProperty("jwt.secret", "my_changeme_super_secret_key_that_is_long_enough");
        environment.setProperty("spring.datasource.url", "jdbc:postgresql://localhost:5432/fstpay");
        environment.setProperty("cors.allowed-origins", "https://fstpay.com");
        environment.setProperty("spring.data.redis.host", "localhost");

        StartupEnvironmentValidator validator = new StartupEnvironmentValidator(environment, properties);

        assertThrows(IllegalStateException.class, () -> validator.onApplicationEvent(mock(ApplicationReadyEvent.class)));
    }

    @Test
    @DisplayName("Should fail validation when CORS origin contains wildcard '*' in production")
    void wildcardCorsInProdThrowsException() {
        environment.setActiveProfiles(ApplicationProfiles.PROD);
        environment.setProperty("jwt.secret", "a_very_secure_long_secret_key_for_jwt_token_signing_12345");
        environment.setProperty("spring.datasource.url", "jdbc:postgresql://localhost:5432/fstpay");
        environment.setProperty("cors.allowed-origins", "*");
        environment.setProperty("spring.data.redis.host", "localhost");

        StartupEnvironmentValidator validator = new StartupEnvironmentValidator(environment, properties);

        assertThrows(IllegalStateException.class, () -> validator.onApplicationEvent(mock(ApplicationReadyEvent.class)));
    }

    @Test
    @DisplayName("Should pass validation when all production configuration rules are satisfied")
    void validProdConfigPasses() {
        environment.setActiveProfiles(ApplicationProfiles.PROD);
        environment.setProperty("jwt.secret", "a_very_secure_long_secret_key_for_jwt_token_signing_12345");
        environment.setProperty("spring.datasource.url", "jdbc:postgresql://localhost:5432/fstpay");
        environment.setProperty("cors.allowed-origins", "https://fstpay.com");
        environment.setProperty("spring.data.redis.host", "localhost");

        StartupEnvironmentValidator validator = new StartupEnvironmentValidator(environment, properties);

        assertDoesNotThrow(() -> validator.onApplicationEvent(mock(ApplicationReadyEvent.class)));
    }
}
