package com.fstpay.aicoach.provider;

public interface AiProvider {
    String generateReply(String message, String userName, String context, String conversationHistory);
    boolean isAvailable();
}
