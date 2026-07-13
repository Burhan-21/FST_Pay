package com.fstpay.notification.service;

/**
 * Abstraction for email delivery.
 * Implementations: ResendEmailProvider (prod), SmtpEmailProvider (dev/fallback).
 */
public interface EmailProvider {

    /**
     * Send a plain-text email.
     */
    void send(String to, String subject, String body);

    /**
     * Send an HTML email.
     */
    void sendHtml(String to, String subject, String htmlBody);

    /**
     * Send an HTML email with a file attachment.
     */
    void sendHtmlWithAttachment(String to, String subject, String htmlBody, byte[] attachmentBytes, String attachmentFilename);
}
