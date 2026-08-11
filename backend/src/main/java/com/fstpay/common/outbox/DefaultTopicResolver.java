package com.fstpay.common.outbox;

import org.springframework.stereotype.Component;

@Component
public class DefaultTopicResolver implements TopicResolver {

    @Override
    public String resolve(String eventType) {
        if (eventType == null || eventType.trim().isEmpty()) {
            return "fstpay.common.events";
        }

        // Dynamically resolve package namespace com.fstpay.<module>.event.<Class> to fstpay.<module>.events
        if (eventType.startsWith("com.fstpay.")) {
            String sub = eventType.substring("com.fstpay.".length());
            int dotIdx = sub.indexOf('.');
            if (dotIdx > 0) {
                String module = sub.substring(0, dotIdx);
                return "fstpay." + module + ".events";
            }
        }

        return "fstpay.common.events";
    }
}
