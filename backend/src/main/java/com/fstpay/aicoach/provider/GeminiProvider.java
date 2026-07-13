package com.fstpay.aicoach.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class GeminiProvider implements AiProvider {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    @Override
    public String generateReply(String message, String userName, String context, String conversationHistory) {
        try {
            String systemPrompt = buildSystemPrompt(userName, context, conversationHistory);
            String fullPrompt = systemPrompt + "\n\nUser Query: " + message;

            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", geminiApiKey);

            String safePrompt = fullPrompt.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
            String requestBody = "{\"contents\":[{\"parts\":[{\"text\":\"" + safePrompt + "\"}]}],\"generationConfig\":{\"maxOutputTokens\":500,\"temperature\":0.7}}";

            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && candidates.size() > 0) {
                    return candidates.get(0).path("content").path("parts").get(0).path("text").asText();
                }
            }
        } catch (Exception e) {
            log.error("Gemini API error: {}", e.getMessage());
        }
        return null;
    }

    @Override
    public boolean isAvailable() {
        return geminiApiKey != null && !geminiApiKey.isEmpty() 
                && !geminiApiKey.contains("REPLACE") && !geminiApiKey.contains("AQ.Ab");
    }

    private String buildSystemPrompt(String userName, String context, String conversationHistory) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are FST Pay's AI Money Coach — a friendly, knowledgeable, and encouraging financial advisor. ");
        prompt.append("Your goal is to help young users (teens and young adults) build healthy financial habits. ");
        prompt.append("Be concise, use simple language, and include relevant emojis. ");
        prompt.append("Give actionable advice. Never share generic advice — always reference the user's actual data below.\n\n");

        prompt.append("User: ").append(userName).append("\n\n");

        if (!context.isEmpty()) {
            prompt.append("--- USER FINANCIAL DATA (use this to personalize your response) ---\n");
            prompt.append(context).append("\n");
            prompt.append("--- END USER FINANCIAL DATA ---\n\n");
        }

        if (!conversationHistory.isEmpty()) {
            prompt.append("--- RECENT CONVERSATION ---\n");
            prompt.append(conversationHistory).append("\n");
            prompt.append("--- END RECENT CONVERSATION ---\n\n");
        }

        prompt.append("Guidelines:\n");
        prompt.append("1. If they ask about budgeting, suggest specific amounts based on their income/spending.\n");
        prompt.append("2. If they are overspending, be gently corrective and suggest a realistic reduction.\n");
        prompt.append("3. If they ask about investing, suggest beginner-friendly options (no stock picks).\n");
        prompt.append("4. Celebrate positive behavior (savings, streaks, sticking to budget).\n");
        prompt.append("5. Keep responses under 200 words.\n");
        prompt.append("6. If you don't have enough data, ask them about their income and expenses.\n");

        return prompt.toString();
    }
}
