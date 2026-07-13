package com.fstpay.aicoach.provider;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class FallbackProvider implements AiProvider {

    @Override
    public String generateReply(String message, String userName, String context, String conversationHistory) {
        String lower = message.toLowerCase();

        // Extract values from context if present to customize the response
        BigDecimal balance = extractDecimalValue(context, "Wallet Balance: ₹");
        BigDecimal income = extractDecimalValue(context, "30-Day Income: ₹");
        BigDecimal spending = extractDecimalValue(context, "30-Day Spending: ₹");

        if (lower.contains("budget") || lower.contains("spend") || lower.contains("save")) {
            BigDecimal baseIncome = (income.compareTo(BigDecimal.ZERO) > 0) ? income : new BigDecimal("10000.00");
            BigDecimal needs = baseIncome.multiply(new BigDecimal("0.50")).setScale(2, RoundingMode.HALF_UP);
            BigDecimal wants = baseIncome.multiply(new BigDecimal("0.30")).setScale(2, RoundingMode.HALF_UP);
            BigDecimal savings = baseIncome.multiply(new BigDecimal("0.20")).setScale(2, RoundingMode.HALF_UP);

            StringBuilder sb = new StringBuilder();
            sb.append("Hi ").append(userName).append("! 👋 Based on your profile, ");
            if (income.compareTo(BigDecimal.ZERO) > 0) {
                sb.append("with a monthly income of **₹").append(income).append("**, ");
            } else {
                sb.append("assuming a starter budget of **₹10,000**, ");
            }
            sb.append("here is a recommended **50/30/20 Budget Plan**:\n\n");
            sb.append("• 🏛️ **Needs (50%)**: **₹").append(needs).append("** (Rent, bills, essentials)\n");
            sb.append("• 🍕 **Wants (30%)**: **₹").append(wants).append("** (Dining out, movies, shopping)\n");
            sb.append("• 📈 **Savings (20%)**: **₹").append(savings).append("** (Emergency fund, goals)\n\n");

            if (spending.compareTo(needs.add(wants)) > 0) {
                sb.append("⚠️ **Alert**: You spent **₹").append(spending).append("** this month, which exceeds your recommended expenses. Try cutting back on Dining Out or Shopping to reach your savings target!");
            } else {
                sb.append("🎉 **Good Job**: Your spending of **₹").append(spending).append("** is well within your budget limits. Keep it up!");
            }
            return sb.toString();
        }

        if (lower.contains("invest") || lower.contains("stock") || lower.contains("mutual fund")) {
            return "Hey " + userName + "! 🚀 Thinking about investing early is a great move. Here's a safe hierarchy to follow:\n\n" +
                    "1. 🏥 **Emergency Fund**: First, save 3-6 months of expenses in a liquid savings account or fixed deposit.\n" +
                    "2. 📈 **Index Funds / SIPs**: Consider systematic investment plans (SIPs) in broad index funds which mimic market growth.\n" +
                    "3. 🎓 **Invest in Yourself**: Buy books, courses, or certifications. This yields the highest returns!\n\n" +
                    "Avoid single stock picking or crypto speculation as a beginner. Slow and steady wins the race! 🐢";
        }

        // Default smart response using actual user data
        StringBuilder sb = new StringBuilder();
        sb.append("Hello ").append(userName).append("! 🤖 I'm your AI Money Coach.\n\n");
        sb.append("Here's your current financial snapshot:\n");
        sb.append("• 💳 **Wallet Balance**: **₹").append(balance).append("**\n");
        if (income.compareTo(BigDecimal.ZERO) > 0) {
            sb.append("• 📥 **30-Day Income**: **₹").append(income).append("**\n");
        }
        if (spending.compareTo(BigDecimal.ZERO) > 0) {
            sb.append("• 📤 **30-Day Spending**: **₹").append(spending).append("**\n");
        }
        sb.append("\nAsk me anything like: \n- *\"How should I budget my money?\"*\n- *\"Where can I start investing?\"*");
        return sb.toString();
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    private BigDecimal extractDecimalValue(String text, String prefix) {
        if (text == null || text.isEmpty()) return BigDecimal.ZERO;
        try {
            int index = text.indexOf(prefix);
            if (index != -1) {
                int start = index + prefix.length();
                int end = start;
                while (end < text.length() && (Character.isDigit(text.charAt(end)) || text.charAt(end) == '.')) {
                    end++;
                }
                return new BigDecimal(text.substring(start, end));
            }
        } catch (Exception e) {
            // Ignore parse errors
        }
        return BigDecimal.ZERO;
    }
}
