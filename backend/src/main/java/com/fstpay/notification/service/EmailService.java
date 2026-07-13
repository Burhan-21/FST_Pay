package com.fstpay.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * High-level email service with typed methods for each email type.
 * Delegates delivery to the active {@link EmailProvider} (Resend or SMTP).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final EmailProvider emailProvider;

    // ── Active Emails ──

    @Async
    public void sendOtpEmail(String toEmail, String otp) {
        String subject = "Verify your FST Pay Account";
        String body = """
                Welcome to FST Pay!

                Your 6-digit OTP verification code is: %s

                This code expires in 5 minutes. Do not share this code with anyone.

                If you did not request this code, please ignore this email.

                Securely,
                The FST Pay Team
                """.formatted(otp);
        emailProvider.send(toEmail, subject, body);
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        String subject = "Reset your FST Pay Password";
        String body = """
                Hello,

                You requested to reset your FST Pay password.

                Click the link below to reset your password (expires in 30 minutes):
                %s

                If you did not request this, please ignore this email and ensure your account is secure.

                Securely,
                The FST Pay Team
                """.formatted(resetLink);
        emailProvider.send(toEmail, subject, body);
    }

    @Async
    public void sendWelcomeEmail(String toEmail, String fullName) {
        String subject = "Welcome to FST Pay \uD83C\uDF89";
        String body = """
                Hi %s,

                Welcome to FST Pay — your AI-powered digital wallet!

                Here's what you can do:
                • Add money to your wallet via UPI, Card, or Bank
                • Generate virtual prepaid cards
                • Track your spending with AI insights
                • Earn rewards and build saving streaks

                Get started: https://fstpay.com/dashboard

                Fast. Secure. Trusted.
                The FST Pay Team
                """.formatted(fullName);
        emailProvider.send(toEmail, subject, body);
    }

    @Async
    public void sendSecurityAlertEmail(String toEmail, String alertMessage) {
        String subject = "\u26A0\uFE0F FST Pay Security Alert";
        String body = """
                Hello,

                We detected the following security event on your FST Pay account:

                %s

                If this was you, no action is needed. If not, please:
                1. Change your password immediately
                2. Review your recent activity
                3. Contact support at support@fstpay.com

                Securely,
                The FST Pay Team
                """.formatted(alertMessage);
        emailProvider.send(toEmail, subject, body);
    }

    @Async
    public void sendEmailVerification(String toEmail, String otp) {
        // Alias for OTP email — keeps the calling code semantic
        sendOtpEmail(toEmail, otp);
    }

    // ── Placeholder Emails (Phase 4+) ──

    @Async
    public void sendMonthlyReport(String toEmail, String reportSummary) {
        // TODO: Phase 4 — Generate and attach PDF report
        log.info("Monthly report email placeholder for {}", toEmail);
    }

    @Async
    public void sendParentReport(String parentEmail, String childName, String reportSummary) {
        // TODO: Phase 5 — Parent monthly spending report
        log.info("Parent report email placeholder for {} (child: {})", parentEmail, childName);
    }

    @Async
    public void sendWeeklySummary(String toEmail, String summaryContent) {
        // TODO: Phase 4 — Weekly spending summary
        log.info("Weekly summary email placeholder for {}", toEmail);
    }

    @Async
    public void sendRewardNotification(String toEmail, String rewardMessage) {
        // TODO: Phase 4 — Reward earned notification
        log.info("Reward notification email placeholder for {}", toEmail);
    }

    @Async
    public void sendAiInsights(String toEmail, String insightsContent) {
        // TODO: Phase 3 — AI financial insights email
        log.info("AI insights email placeholder for {}", toEmail);
    }

    @Async
    public void sendParentInvitation(String parentEmail, String childName, String inviteLink) {
        // TODO: Phase 5 — Parent invitation email
        String subject = "You've been invited to FST Pay Family";
        String body = """
                Hello,

                %s has invited you to join FST Pay as their parent/guardian.

                Click the link below to accept the invitation and set up your parent account:
                %s

                This link expires in 48 hours.

                Fast. Secure. Trusted.
                The FST Pay Team
                """.formatted(childName, inviteLink);
        emailProvider.send(parentEmail, subject, body);
    }
}
