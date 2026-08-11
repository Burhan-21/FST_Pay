package com.fstpay.common.outbox;

import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    @Query("SELECT e.id FROM OutboxEvent e WHERE e.status IN (:statuses) AND e.retryCount < :maxRetries ORDER BY e.createdAt ASC")
    List<UUID> findEventIdsToProcess(
        @Param("statuses") List<OutboxStatus> statuses, 
        @Param("maxRetries") int maxRetries, 
        Pageable pageable
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2")})
    @Query("SELECT e FROM OutboxEvent e WHERE e.id = :id")
    Optional<OutboxEvent> findByIdForUpdate(@Param("id") UUID id);

    long countByStatus(OutboxStatus status);

    List<OutboxEvent> findByStatus(OutboxStatus status);

    @Query("SELECT e FROM OutboxEvent e WHERE e.status = :status AND e.createdAt < :cutoff ORDER BY e.createdAt ASC")
    List<OutboxEvent> findOldSentEvents(
        @Param("status") OutboxStatus status, 
        @Param("cutoff") java.time.Instant cutoff, 
        org.springframework.data.domain.Pageable pageable
    );
}
