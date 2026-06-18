package com.fstpay.common.service;

import com.fstpay.common.entity.AuditLog;
import com.fstpay.common.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Async
    public void logAuthEvent(String email, String eventType, String details) {
        try {
            String ip = null;
            String userAgent = null;

            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                ip = request.getRemoteAddr();
                userAgent = request.getHeader("User-Agent");
                if (userAgent != null && userAgent.length() > 500) {
                    userAgent = userAgent.substring(0, 500);
                }
            }

            AuditLog auditLog = AuditLog.builder()
                    .email(email)
                    .eventType(eventType)
                    .details(details)
                    .ipAddress(ip)
                    .userAgent(userAgent)
                    .build();

            auditLogRepository.save(auditLog);

            if (eventType.contains("FAILED") || eventType.contains("BLOCKED") || eventType.contains("LOCKED")) {
                log.warn("[AUDIT] {} | {} | {} | IP: {}", eventType, email, details, ip);
            } else {
                log.info("[AUDIT] {} | {} | {}", eventType, email, details);
            }
        } catch (Exception e) {
            log.error("Failed to write audit log", e);
        }
    }
}
