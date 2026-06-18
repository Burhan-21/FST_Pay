package com.fstpay.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Async
    public void sendOtpEmail(String toEmail, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("FST Pay <no-reply@fstpay.com>");
            message.setTo(toEmail);
            message.setSubject("Verify your FST Pay Account");
            message.setText("""
                Welcome to FST Pay!

                Your 6-digit OTP verification code is: %s

                This code expires in 5 minutes. Do not share this code with anyone.

                If you did not request this code, please ignore this email.

                Securely,
                The FST Pay Team
                """.formatted(otp));
            mailSender.send(message);
            log.info("Verification email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String token) {
        try {
            String resetLink = "http://localhost:5173/reset-password?token=" + token;

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("FST Pay <no-reply@fstpay.com>");
            message.setTo(toEmail);
            message.setSubject("Reset your FST Pay Password");
            message.setText("""
                Hello,

                You requested to reset your FST Pay password.

                Click the link below to reset your password (expires in 30 minutes):
                %s

                If you did not request this, please ignore this email and ensure your account is secure.

                Securely,
                The FST Pay Team
                """.formatted(resetLink));
            mailSender.send(message);
            log.info("Password reset email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}: {}", toEmail, e.getMessage());
        }
    }
}
