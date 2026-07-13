package com.fstpay.audit.service;

import com.fstpay.audit.entity.AuditLog;
import com.fstpay.audit.repository.AuditLogRepository;
import com.fstpay.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void log(User user, String action, String description, String ipAddress) {
        AuditLog auditLog = AuditLog.builder()
                .user(user)
                .action(action)
                .description(description)
                .ipAddress(ipAddress)
                .build();
        auditLogRepository.save(auditLog);
        log.info("Audit Logged: User: {}, Action: {}, Desc: {}", 
                user != null ? user.getEmail() : "SYSTEM", action, description);
    }

    @Transactional
    public void log(User user, String action, String description) {
        log(user, action, description, "0.0.0.0");
    }
}
