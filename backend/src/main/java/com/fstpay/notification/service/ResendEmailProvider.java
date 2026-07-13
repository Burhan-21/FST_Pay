package com.fstpay.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

/**
 * Sends emails via Resend API (https://resend.com).
 * Activated when app.email.provider=resend.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.email.provider", havingValue = "resend")
public class ResendEmailProvider implements EmailProvider {

    private static final String RESEND_API_URL = "https://api.resend.com/emails";

    @Value("${app.email.resend-api-key}")
    private String apiKey;

    @Value("${app.email.from:FST Pay <no-reply@fstpay.com>}")
    private String fromAddress;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Override
    public void send(String to, String subject, String body) {
        String json = """
                {
                  "from": "%s",
                  "to": ["%s"],
                  "subject": "%s",
                  "text": %s
                }
                """.formatted(
                fromAddress,
                escapeJson(to),
                escapeJson(subject),
                jsonString(body)
        );
        doSend(json, to, subject);
    }

    @Override
    public void sendHtml(String to, String subject, String htmlBody) {
        String json = """
                {
                  "from": "%s",
                  "to": ["%s"],
                  "subject": "%s",
                  "html": %s
                }
                """.formatted(
                fromAddress,
                escapeJson(to),
                escapeJson(subject),
                jsonString(htmlBody)
        );
        doSend(json, to, subject);
    }

    @Override
    public void sendHtmlWithAttachment(String to, String subject, String htmlBody, byte[] attachmentBytes, String attachmentFilename) {
        try {
            String base64Content = Base64.getEncoder().encodeToString(attachmentBytes);
            String json = """
                    {
                      "from": "%s",
                      "to": ["%s"],
                      "subject": "%s",
                      "html": %s,
                      "attachments": [
                        {
                          "content": "%s",
                          "filename": "%s"
                        }
                      ]
                    }
                    """.formatted(
                    fromAddress,
                    escapeJson(to),
                    escapeJson(subject),
                    jsonString(htmlBody),
                    base64Content,
                    escapeJson(attachmentFilename)
            );
            doSend(json, to, subject);
        } catch (Exception e) {
            log.error("Failed to build attachment for Resend email to {}: {}", to, e.getMessage());
        }
    }

    private void doSend(String jsonBody, String to, String subject) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(RESEND_API_URL))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("Email sent via Resend to {} [{}]", to, subject);
            } else {
                log.error("Resend API error ({}): {}", response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.error("Failed to send email via Resend to {}: {}", to, e.getMessage());
        }
    }

    private String escapeJson(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String jsonString(String value) {
        if (value == null) return "\"\"";
        return "\"" + value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t")
                + "\"";
    }
}
