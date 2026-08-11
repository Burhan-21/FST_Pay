package com.fstpay.common.config.env;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.util.List;

/**
 * Immutable configuration properties for FST Pay environment validation parameters.
 */
@ConfigurationProperties(prefix = "app.env")
public record EnvironmentProperties(
        @DefaultValue("true") boolean strictValidationEnabled,
        @DefaultValue("32") int minJwtSecretLength,
        @DefaultValue({"changeme", "placeholder", "your_secret_here", "Admin@Secure123"}) List<String> disallowedPlaceholders
) {
}
