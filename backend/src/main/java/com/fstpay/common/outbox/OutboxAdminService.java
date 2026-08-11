package com.fstpay.common.outbox;

import io.micrometer.core.instrument.MeterRegistry;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OutboxAdminService {

    private final OutboxEventRepository outboxEventRepository;
    private final MeterRegistry meterRegistry;
    private final OutboxProperties outboxProperties;
    private final TopicResolver topicResolver;
    private final EntityManager entityManager;

    @Transactional
    public boolean retry(UUID id) {
        OutboxEvent event = outboxEventRepository.findById(id).orElse(null);
        if (event != null && (event.getStatus() == OutboxStatus.DEAD_LETTER || event.getStatus() == OutboxStatus.FAILED)) {
            event.setStatus(OutboxStatus.PENDING);
            event.setRetryCount(0);
            event.setLastError(null);
            outboxEventRepository.save(event);
            log.info("Reset outbox event {} to PENDING for retry.", id);
            return true;
        }
        return false;
    }

    @Transactional
    public int retryAllDeadLetters() {
        List<OutboxEvent> deadLetters = outboxEventRepository.findByStatus(OutboxStatus.DEAD_LETTER);
        for (OutboxEvent event : deadLetters) {
            event.setStatus(OutboxStatus.PENDING);
            event.setRetryCount(0);
            event.setLastError(null);
        }
        outboxEventRepository.saveAll(deadLetters);
        log.info("Reset {} DEAD_LETTER outbox events to PENDING.", deadLetters.size());
        return deadLetters.size();
    }

    @Transactional
    public int cleanup(int retentionDays, int batchSize) {
        Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        List<OutboxEvent> toDelete = outboxEventRepository.findOldSentEvents(
                OutboxStatus.SENT,
                cutoff,
                org.springframework.data.domain.PageRequest.of(0, batchSize)
        );

        if (!toDelete.isEmpty()) {
            outboxEventRepository.deleteAllInBatch(toDelete);
            log.info("Cleaned up {} old SENT outbox events older than {} days.", toDelete.size(), retentionDays);
        }
        return toDelete.size();
    }

    @Transactional
    public Map<String, Object> executeReplay(List<UUID> ids, Instant start, Instant end, String aggregateId,
                                            String eventType, String correlationId, String topic, boolean dryRun) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<OutboxEvent> cq = cb.createQuery(OutboxEvent.class);
        Root<OutboxEvent> root = cq.from(OutboxEvent.class);
        List<Predicate> predicates = new ArrayList<>();

        if (ids != null && !ids.isEmpty()) {
            predicates.add(root.get("id").in(ids));
        }
        if (start != null) {
            predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), start));
        }
        if (end != null) {
            predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), end));
        }
        if (aggregateId != null && !aggregateId.trim().isEmpty()) {
            predicates.add(cb.equal(root.get("aggregateId"), aggregateId));
        }
        if (eventType != null && !eventType.trim().isEmpty()) {
            predicates.add(cb.equal(root.get("eventType"), eventType));
        }
        if (correlationId != null && !correlationId.trim().isEmpty()) {
            predicates.add(cb.equal(root.get("correlationId"), correlationId));
        }

        cq.where(predicates.toArray(new Predicate[0]));
        cq.orderBy(cb.asc(root.get("createdAt")));

        List<OutboxEvent> events = entityManager.createQuery(cq).getResultList();

        // Apply topic filter in memory
        if (topic != null && !topic.trim().isEmpty()) {
            events = events.stream()
                    .filter(e -> topic.equalsIgnoreCase(topicResolver.resolve(e.getEventType())))
                    .collect(Collectors.toList());
        }

        int matchCount = events.size();
        boolean requiresConfirmation = dryRun && matchCount > 10;

        List<Map<String, Object>> eventSummaries = events.stream().map(e -> {
            Map<String, Object> summary = new HashMap<>();
            summary.put("id", e.getId());
            summary.put("eventType", e.getEventType());
            summary.put("aggregateId", e.getAggregateId());
            summary.put("status", e.getStatus().name());
            summary.put("createdAt", e.getCreatedAt().toString());
            return summary;
        }).collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("matchCount", matchCount);
        result.put("estimatedReplayOrder", "ASCENDING_BY_CREATED_AT");
        result.put("requiresConfirmation", requiresConfirmation);
        result.put("events", eventSummaries);

        if (!dryRun && matchCount > 0) {
            for (OutboxEvent event : events) {
                event.setStatus(OutboxStatus.PENDING);
                event.setRetryCount(0);
                event.setLastError(null);
                outboxEventRepository.save(event);
            }
            meterRegistry.counter("fstpay.replay.events.total").increment(matchCount);
            result.put("executed", true);
            log.info("Triggered replay for {} outbox events.", matchCount);
        } else {
            result.put("executed", false);
        }

        return result;
    }

    public Map<String, Object> statistics() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("pendingCount", outboxEventRepository.countByStatus(OutboxStatus.PENDING));
        stats.put("processingCount", outboxEventRepository.countByStatus(OutboxStatus.PROCESSING));
        stats.put("sentCount", outboxEventRepository.countByStatus(OutboxStatus.SENT));
        stats.put("failedCount", outboxEventRepository.countByStatus(OutboxStatus.FAILED));
        stats.put("deadLetterCount", outboxEventRepository.countByStatus(OutboxStatus.DEAD_LETTER));

        // Expose oldest pending event age in seconds
        long oldestAgeSeconds = 0;
        List<UUID> oldestPendingIds = outboxEventRepository.findEventIdsToProcess(
                List.of(OutboxStatus.PENDING, OutboxStatus.FAILED),
                5,
                org.springframework.data.domain.PageRequest.of(0, 1)
        );
        if (!oldestPendingIds.isEmpty()) {
            OutboxEvent oldest = outboxEventRepository.findById(oldestPendingIds.get(0)).orElse(null);
            if (oldest != null) {
                oldestAgeSeconds = ChronoUnit.SECONDS.between(oldest.getCreatedAt(), Instant.now());
            }
        }
        stats.put("oldestPendingAgeSeconds", oldestAgeSeconds);

        // Fetch latency and retries from Micrometer
        double avgProcessingTimeMs = 0.0;
        io.micrometer.core.instrument.Timer timer = meterRegistry.find("fstpay.outbox.processing.duration").timer();
        if (timer != null && timer.count() > 0) {
            avgProcessingTimeMs = timer.mean(java.util.concurrent.TimeUnit.MILLISECONDS);
        }
        stats.put("averageProcessingTimeMs", avgProcessingTimeMs);

        double retryRate = 0.0;
        io.micrometer.core.instrument.Counter retryCounter = meterRegistry.find("fstpay.outbox.events.retry.total").counter();
        io.micrometer.core.instrument.Counter publishedCounter = meterRegistry.find("fstpay.outbox.events.published.total").counter();
        if (publishedCounter != null && publishedCounter.count() > 0) {
            double retries = retryCounter != null ? retryCounter.count() : 0.0;
            retryRate = retries / publishedCounter.count();
        }
        stats.put("retryRate", retryRate);

        return stats;
    }

    public List<OutboxEvent> getDeadLetterEvents() {
        return outboxEventRepository.findByStatus(OutboxStatus.DEAD_LETTER);
    }
}
