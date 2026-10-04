package com.fstpay.common.idempotency.aspect;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.idempotency.annotation.Idempotent;
import com.fstpay.common.idempotency.dto.IdempotencyCheckResult;
import com.fstpay.common.idempotency.dto.IdempotencyRecord;
import com.fstpay.common.idempotency.service.IdempotencyService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * Aspect enforcing API Idempotency across financial mutation endpoints.
 * 
 * Author: Shaikh Mohammed Burhan
 */
@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class IdempotentAspect {

    public static final String IDEMPOTENCY_HEADER = "Idempotency-Key";

    private final IdempotencyService idempotencyService;
    private final ObjectMapper objectMapper;

    @Around("@annotation(idempotent)")
    public Object enforceIdempotency(ProceedingJoinPoint joinPoint, Idempotent idempotent) throws Throwable {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            // Not a web request context (e.g. internal test call)
            return joinPoint.proceed();
        }

        HttpServletRequest request = attributes.getRequest();
        String idempotencyKey = request.getHeader(IDEMPOTENCY_HEADER);

        if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
            if (idempotent.required()) {
                throw new BadRequestException("Missing required '" + IDEMPOTENCY_HEADER + "' header for this operation.");
            }
            return joinPoint.proceed();
        }

        String userEmail = resolveUserEmail(request);
        String endpoint = request.getMethod() + " " + request.getRequestURI();
        String fingerprint = computeFingerprint(joinPoint, endpoint);

        // Check or acquire idempotency lock
        IdempotencyCheckResult checkResult = idempotencyService.start(
                userEmail,
                idempotencyKey,
                endpoint,
                fingerprint,
                idempotent.lockTimeoutSeconds()
        );

        if (checkResult.isCached()) {
            IdempotencyRecord cached = checkResult.getRecord();
            log.info("Serving idempotent replay for user '{}', key '{}', status: {}", userEmail, idempotencyKey, cached.getStatusCode());
            // Reconstruct ResponseEntity from cached body
            Object body = cached.getResponseBodyJson() != null
                    ? objectMapper.readTree(cached.getResponseBodyJson())
                    : null;
            return ResponseEntity.status(cached.getStatusCode()).body(body);
        }

        Object result;
        try {
            result = joinPoint.proceed();
        } catch (Throwable t) {
            // Failure occurred: clean up pending lock so client can retry
            idempotencyService.fail(userEmail, idempotencyKey);
            throw t;
        }

        // Cache the successful response
        try {
            int statusCode = 200;
            String bodyJson = null;
            if (result instanceof ResponseEntity<?> responseEntity) {
                statusCode = responseEntity.getStatusCode().value();
                if (responseEntity.getBody() != null) {
                    bodyJson = objectMapper.writeValueAsString(responseEntity.getBody());
                }
            } else if (result != null) {
                bodyJson = objectMapper.writeValueAsString(result);
            }

            idempotencyService.complete(
                    userEmail,
                    idempotencyKey,
                    endpoint,
                    fingerprint,
                    statusCode,
                    bodyJson,
                    idempotent.expireSeconds()
            );
        } catch (Exception e) {
            log.warn("Failed to serialize and cache idempotent response for key '{}': {}", idempotencyKey, e.getMessage());
        }

        return result;
    }

    private String resolveUserEmail(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null && !auth.getName().equalsIgnoreCase("anonymousUser")) {
            return auth.getName();
        }
        if (request.getUserPrincipal() != null) {
            return request.getUserPrincipal().getName();
        }
        return "anonymous";
    }

    private String computeFingerprint(ProceedingJoinPoint joinPoint, String endpoint) {
        StringBuilder payloadBuilder = new StringBuilder(endpoint).append(":");
        for (Object arg : joinPoint.getArgs()) {
            if (arg == null) continue;
            // Skip servlet and security context objects
            if (arg instanceof jakarta.servlet.ServletRequest ||
                arg instanceof jakarta.servlet.ServletResponse ||
                arg instanceof org.springframework.security.core.userdetails.UserDetails ||
                arg instanceof java.security.Principal) {
                continue;
            }
            try {
                payloadBuilder.append(objectMapper.writeValueAsString(arg));
            } catch (Exception e) {
                payloadBuilder.append(arg.toString());
            }
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(payloadBuilder.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            return Integer.toHexString(payloadBuilder.toString().hashCode());
        }
    }
}
