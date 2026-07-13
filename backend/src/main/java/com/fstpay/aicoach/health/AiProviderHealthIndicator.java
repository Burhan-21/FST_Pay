package com.fstpay.aicoach.health;

import com.fstpay.aicoach.provider.GeminiProvider;
import com.fstpay.aicoach.provider.OpenAiProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AiProviderHealthIndicator implements HealthIndicator {

    private final GeminiProvider geminiProvider;
    private final OpenAiProvider openAiProvider;

    @Value("${ai.provider:gemini}")
    private String aiProvider;

    @Override
    public Health health() {
        Map<String, Object> details = new HashMap<>();
        boolean geminiAvail = geminiProvider.isAvailable();
        boolean openAiAvail = openAiProvider.isAvailable();

        details.put("configuredProvider", aiProvider);
        details.put("geminiAvailable", geminiAvail);
        details.put("openAiAvailable", openAiAvail);
        details.put("fallbackActive", true); // Local rule engine is always active fallback

        boolean primaryAvailable = false;
        if ("gemini".equalsIgnoreCase(aiProvider)) {
            primaryAvailable = geminiAvail;
        } else if ("openai".equalsIgnoreCase(aiProvider)) {
            primaryAvailable = openAiAvail;
        }

        if (primaryAvailable) {
            return Health.up().withDetails(details).build();
        } else {
            // Degraded health if configured API is not available, using fallback rules engine
            return Health.status("DEGRADED")
                    .withDetails(details)
                    .withDetail("message", "Primary AI service is offline. Fallback rules engine is active.")
                    .build();
        }
    }
}
