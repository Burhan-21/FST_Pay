package com.fstpay.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import jakarta.mail.internet.MimeMessage;

/**
 * Sends emails via SMTP (Spring JavaMailSender).
 * Activated when app.email.provider=smtp (default).
 * Use with Mailtrap for dev or any SMTP server.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.email.provider", havingValue = "smtp", matchIfMissing = true)
@RequiredArgsConstructor
public class SmtpEmailProvider implements EmailProvider {

    private final JavaMailSender mailSender;

    @Override
    public void send(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("FST Pay <no-reply@fstpay.com>");
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email sent via SMTP to {} [{}]", to, subject);
        } catch (Exception e) {
            log.error("Failed to send email via SMTP to {}: {}", to, e.getMessage());
        }
    }

    @Override
    public void sendHtml(String to, String subject, String htmlBody) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom("FST Pay <no-reply@fstpay.com>");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(mimeMessage);
            log.info("HTML email sent via SMTP to {} [{}]", to, subject);
        } catch (Exception e) {
            log.error("Failed to send HTML email via SMTP to {}: {}", to, e.getMessage());
        }
    }

    @Override
    public void sendHtmlWithAttachment(String to, String subject, String htmlBody, byte[] attachmentBytes, String attachmentFilename) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom("FST Pay <no-reply@fstpay.com>");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            helper.addAttachment(attachmentFilename, new ByteArrayResource(attachmentBytes));
            mailSender.send(mimeMessage);
            log.info("HTML email with attachment sent via SMTP to {} [{}]", to, subject);
        } catch (Exception e) {
            log.error("Failed to send HTML email with attachment via SMTP to {}: {}", to, e.getMessage());
        }
    }
}
