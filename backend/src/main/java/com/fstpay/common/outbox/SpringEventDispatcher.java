package com.fstpay.common.outbox;

import com.fstpay.common.event.DomainEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class SpringEventDispatcher implements EventDispatcher {

    private final ApplicationEventPublisher eventPublisher;
    private final EventSerializer eventSerializer;

    @Override
    public void dispatch(OutboxEvent event) {
        log.debug("Dispatching event {} locally via Spring EventPublisher.", event.getId());
        try {
            // Deserialize event payload using EventSerializer
            DomainEvent domainEvent = (DomainEvent) eventSerializer.deserialize(event.getPayload(), event.getEventType());

            // Publish internally to Spring event listeners
            eventPublisher.publishEvent(domainEvent);
        } catch (Exception e) {
            throw new RuntimeException("Failed to locally dispatch event " + event.getId(), e);
        }
    }
}
