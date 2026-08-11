package com.fstpay.common.outbox;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface ProcessedEventRepository extends JpaRepository<ProcessedEvent, UUID> {

    @Query("SELECT pe FROM ProcessedEvent pe WHERE pe.processedAt < :cutoff")
    List<ProcessedEvent> findOldProcessedEvents(@Param("cutoff") Instant cutoff, Pageable pageable);
}
