package com.fstpay.common.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1) // Run right after CorrelationIdFilter so MDC is populated
public class RequestResponseLoggingFilter extends OncePerRequestFilter {

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    private static final List<String> SENSITIVE_KEYS = Arrays.asList(
            "password", "otp", "token", "refreshToken", "authorization", "secret", "apiKey", "recaptcha", "api-key"
    );

    // Regex to find JSON key-values like "password":"value" or "password" : "value"
    private static final Pattern JSON_MASK_PATTERN = Pattern.compile(
            "(?i)\"([^\"]*(" + String.join("|", SENSITIVE_KEYS) + ")[^\"]*)\"\\s*:\\s*\"([^\"]+)\""
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Skip logging for static resources and actuator endpoints to avoid noise
        String path = request.getRequestURI();
        if (path.startsWith("/actuator") || path.startsWith("/static/") || path.equals("/favicon.ico")) {
            filterChain.doFilter(request, response);
            return;
        }

        ContentCachingRequestWrapper requestWrapper = new ContentCachingRequestWrapper(request);
        ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(response);

        long startTime = System.currentTimeMillis();

        try {
            filterChain.doFilter(requestWrapper, responseWrapper);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            logRequestAndResponse(requestWrapper, responseWrapper, duration);
            responseWrapper.copyBodyToResponse();
        }
    }

    private void logRequestAndResponse(ContentCachingRequestWrapper request, ContentCachingResponseWrapper response, long duration) {
        String method = request.getMethod();
        String uri = request.getRequestURI();
        String queryString = request.getQueryString();
        String clientIp = getClientIP(request);
        int status = response.getStatus();

        String fullUri = queryString != null ? uri + "?" + queryString : uri;

        // Extract and mask request body
        String requestBody = getBody(request.getContentAsByteArray(), request.getCharacterEncoding());
        String maskedRequestBody = maskSensitiveData(requestBody);

        String correlationId = org.slf4j.MDC.get(CorrelationIdFilter.MDC_KEY);

        if ("prod".equalsIgnoreCase(activeProfile)) {
            // In production, do not log response bodies
            log.info("HTTP {} {} | Status: {} | IP: {} | Duration: {}ms | Trace: {} | Req Body: {}",
                    method, fullUri, status, clientIp, duration, correlationId != null ? correlationId : "NONE",
                    maskedRequestBody.isEmpty() ? "[EMPTY]" : maskedRequestBody);
        } else {
            // In development/testing, log response body too
            String responseBody = getBody(response.getContentAsByteArray(), response.getCharacterEncoding());
            String maskedResponseBody = maskSensitiveData(responseBody);

            log.info("HTTP {} {} | Status: {} | IP: {} | Duration: {}ms | Trace: {} | Req Body: {} | Resp Body: {}",
                    method, fullUri, status, clientIp, duration, correlationId != null ? correlationId : "NONE",
                    maskedRequestBody.isEmpty() ? "[EMPTY]" : maskedRequestBody,
                    maskedResponseBody.isEmpty() ? "[EMPTY]" : maskedResponseBody);
        }
    }

    private String getBody(byte[] content, String encoding) {
        if (content == null || content.length == 0) {
            return "";
        }
        try {
            String charset = encoding != null ? encoding : "UTF-8";
            // Limit body size to 2048 chars to prevent huge logs
            String body = new String(content, charset);
            if (body.length() > 2048) {
                return body.substring(0, 2048) + "... [TRUNCATED]";
            }
            return body;
        } catch (UnsupportedEncodingException e) {
            return "[UNSUPPORTED ENCODING]";
        }
    }

    private String maskSensitiveData(String payload) {
        if (payload == null || payload.isEmpty()) {
            return "";
        }
        // Apply JSON regex masking
        return JSON_MASK_PATTERN.matcher(payload).replaceAll("\"$1\":\"[MASKED]\"");
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isEmpty()) {
            return xfHeader.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
