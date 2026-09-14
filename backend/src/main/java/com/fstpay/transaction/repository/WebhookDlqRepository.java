package com.fstpay.transaction.repository;

import com.fstpay.transaction.entity.WebhookDlq;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface WebhookDlqRepository extends JpaRepository<WebhookDlq, UUID> {

    @Query("SELECT w FROM WebhookDlq w WHERE w.status = 'PENDING_RETRY' AND (w.nextRetryAt IS NULL OR w.nextRetryAt <= :now) ORDER BY w.createdAt ASC")
    List<WebhookDlq> findEligibleForRetry(@Param("now") Instant now, Pageable pageable);

    Page<WebhookDlq> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    long countByStatus(String status);

    @Query("SELECT w FROM WebhookDlq w WHERE w.status IN ('PENDING_RETRY', 'DEAD_LETTER') ORDER BY w.createdAt ASC")
    List<WebhookDlq> findAllEligibleForReplay();
}
