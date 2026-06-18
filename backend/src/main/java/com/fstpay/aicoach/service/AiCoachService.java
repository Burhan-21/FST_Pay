package com.fstpay.aicoach.service;

import com.fstpay.aicoach.dto.ChatRequest;
import com.fstpay.aicoach.dto.ChatResponse;
import com.fstpay.aicoach.entity.AiSession;
import com.fstpay.aicoach.repository.AiSessionRepository;
import com.fstpay.analytics.dto.AnalyticsResponse;
import com.fstpay.analytics.service.AnalyticsService;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiCoachService {

    private final AiSessionRepository aiSessionRepository;
    private final UserRepository userRepository;
    private final AnalyticsService analyticsService;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${ai.provider:gemini}")
    private String aiProvider;

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    @Value("${openai.api-key:}")
    private String openaiApiKey;

    @Value("${openai.model:gpt-4o-mini}")
    private String openaiModel;

    @Transactional
    public ChatResponse chat(String email, ChatRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String userMsg = request.getMessage().trim();
        String context = buildFinancialContext(email);
        String conversationHistory = buildConversationHistory(email);
        String reply = generateCoachingReply(userMsg, user.getFullName(), context, conversationHistory);

        AiSession session = AiSession.builder()
                .user(user)
                .prompt(userMsg)
                .response(reply)
                .tokensUsed(estimateTokens(userMsg) + estimateTokens(reply))
                .build();
        aiSessionRepository.save(session);

        return ChatResponse.builder()
                .reply(reply)
                .build();
    }

    private String buildFinancialContext(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Wallet wallet = walletRepository.findByUser(user).orElse(null);
        BigDecimal balance = wallet != null ? wallet.getBalance() : BigDecimal.ZERO;

        AnalyticsResponse analytics = analyticsService.getAnalytics(email, 30);

        List<Transaction> recentTxns = transactionRepository
                .findTop5ByWalletOrderByCreatedAtDesc(
                        walletRepository.findByUser(user).orElse(null));

        StringBuilder ctx = new StringBuilder();
        ctx.append("User Financial Profile:\n");
        ctx.append("- Name: ").append(user.getFullName()).append("\n");
        ctx.append("- Wallet Balance: ₹").append(balance.setScale(2, RoundingMode.HALF_UP)).append("\n");
        ctx.append("- 30-Day Income: ₹").append(analytics.getTotalCredit().setScale(2, RoundingMode.HALF_UP)).append("\n");
        ctx.append("- 30-Day Spending: ₹").append(analytics.getTotalDebit().setScale(2, RoundingMode.HALF_UP)).append("\n");
        ctx.append("- 30-Day Net Savings: ₹").append(analytics.getNetSavings().setScale(2, RoundingMode.HALF_UP)).append("\n");
        ctx.append("- Daily Average Spend: ₹").append(analytics.getDailyAverageSpend().setScale(2, RoundingMode.HALF_UP)).append("\n");

        if (analytics.getSpendByCategory() != null && !analytics.getSpendByCategory().isEmpty()) {
            ctx.append("- Spending by Category:\n");
            analytics.getSpendByCategory().entrySet().stream()
                    .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                    .forEach(entry ->
                        ctx.append("  * ").append(entry.getKey()).append(": ₹")
                            .append(entry.getValue().setScale(2, RoundingMode.HALF_UP)).append("\n")
                    );
        }

        if (recentTxns != null && !recentTxns.isEmpty()) {
            ctx.append("- Recent Transactions:\n");
            recentTxns.forEach(txn ->
                ctx.append("  * ").append(txn.getCreatedAt()).append(" | ")
                    .append(txn.getType()).append(" | ₹")
                    .append(txn.getAmount().setScale(2, RoundingMode.HALF_UP))
                    .append(" | ").append(txn.getCategory())
                    .append(txn.getMerchant() != null ? " | " + txn.getMerchant() : "")
                    .append("\n")
            );
        }

        return ctx.toString();
    }

    private String buildConversationHistory(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<AiSession> recentSessions = aiSessionRepository
                .findByUser(user, PageRequest.of(0, 5))
                .getContent();

        if (recentSessions.isEmpty()) {
            return "";
        }

        StringBuilder history = new StringBuilder("Recent Conversation History:\n");
        for (int i = recentSessions.size() - 1; i >= 0; i--) {
            AiSession session = recentSessions.get(i);
            history.append("User: ").append(session.getPrompt()).append("\n");
            history.append("Coach: ").append(session.getResponse()).append("\n");
        }
        return history.toString();
    }

    private String generateCoachingReply(String message, String userName, String context, String conversationHistory) {
        if ("openai".equalsIgnoreCase(aiProvider) && openaiApiKey != null && !openaiApiKey.isEmpty()
                && !openaiApiKey.contains("REPLACE")) {
            return callOpenAi(message, userName, context, conversationHistory);
        }

        if (geminiApiKey != null && !geminiApiKey.isEmpty() && !geminiApiKey.contains("REPLACE")
                && !geminiApiKey.contains("AQ.Ab")) {
            return callGemini(message, userName, context, conversationHistory);
        }

        return fallbackReply(message, userName);
    }

    private String callOpenAi(String message, String userName, String context, String conversationHistory) {
        try {
            String systemPrompt = buildSystemPrompt(userName, context, conversationHistory);

            String requestBody = objectMapper.writeValueAsString(Map.of(
                    "model", openaiModel,
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user", "content", message)
                    ),
                    "max_tokens", 500,
                    "temperature", 0.7
            ));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openaiApiKey);

            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                    "https://api.openai.com/v1/chat/completions", entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                return root.path("choices").get(0).path("message").path("content").asText();
            }
        } catch (Exception e) {
            log.error("OpenAI API error: {}", e.getMessage());
        }
        return null;
    }

    private String callGemini(String message, String userName, String context, String conversationHistory) {
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

    private String fallbackReply(String message, String userName) {
        String lower = message.toLowerCase();

        if (lower.contains("budget") || lower.contains("spend") || lower.contains("save")) {
            return "Hi " + userName + "! 👋 To give you personalized budget advice, I need access to your spending data. " +
                    "Please configure the AI provider (OpenAI or Gemini) in the backend settings. " +
                    "Until then, here's a general tip: try the 50/30/20 rule — 50% for needs, 30% for wants, 20% for savings. 📊";
        }

        if (lower.contains("invest") || lower.contains("stock") || lower.contains("mutual fund")) {
            return "Great that you're thinking about investing, " + userName + "! 🚀 For personalized investment advice, " +
                    "please configure the AI backend. For now: start with a small amount in a liquid mutual fund or fixed deposit. 📈";
        }

        return "Hi " + userName + ", I'm your AI Money Coach! 🤖 To provide real-time, personalized financial guidance, " +
                "please set up the GEMINI_API_KEY or OPENAI_API_KEY in the backend. " +
                "I can help with budgeting, saving, expense tracking, and beginner investing! 💰";
    }

    private int estimateTokens(String text) {
        if (text == null || text.isEmpty()) return 0;
        return text.length() / 4;
    }
}
