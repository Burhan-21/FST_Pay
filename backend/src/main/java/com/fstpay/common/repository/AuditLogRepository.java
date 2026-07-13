package com.fstpay.common.repository;

import com.fstpay.common.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository("commonAuditLogRepository")
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    Page<AuditLog> findByEmailOrderByCreatedAtDesc(String email, Pageable pageable);
    Page<AuditLog> findByEventTypeOrderByCreatedAtDesc(String eventType, Pageable pageable);
    long countByCreatedAtAfterAndEventType(Instant after, String eventType);
}
