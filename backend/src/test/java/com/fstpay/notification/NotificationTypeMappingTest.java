package com.fstpay.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fstpay.notification.entity.Notification;
import com.fstpay.notification.entity.NotificationPreference;
import com.fstpay.notification.enums.NotificationType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class NotificationTypeMappingTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void testNotificationTypeEnumValues() {
        // Assert that all expected enums are defined
        assertNotNull(NotificationType.valueOf("POCKET_MONEY"));
        assertNotNull(NotificationType.valueOf("APPROVAL_REQUEST"));
        assertNotNull(NotificationType.valueOf("APPROVAL_DECISION"));
        assertNotNull(NotificationType.valueOf("GOAL_COMPLETED"));
        assertNotNull(NotificationType.valueOf("REPORT_READY"));
        assertNotNull(NotificationType.valueOf("SECURITY_ALERT"));
        assertNotNull(NotificationType.valueOf("REWARD"));
        assertNotNull(NotificationType.valueOf("SYSTEM"));
        assertNotNull(NotificationType.valueOf("WELCOME"));
        assertNotNull(NotificationType.valueOf("AI_INSIGHT"));
    }

    @Test
    void testSerializationAndDeserialization() throws Exception {
        for (NotificationType type : NotificationType.values()) {
            // Serialize
            String json = objectMapper.writeValueAsString(type);
            assertEquals("\"" + type.name() + "\"", json);

            // Deserialize
            NotificationType deserialized = objectMapper.readValue(json, NotificationType.class);
            assertEquals(type, deserialized);
        }
    }

    @Test
    void testNotificationEntityEnumMapping() {
        Notification notification = new Notification();
        notification.setType(NotificationType.WELCOME);
        assertEquals(NotificationType.WELCOME, notification.getType());

        notification.setType(NotificationType.AI_INSIGHT);
        assertEquals(NotificationType.AI_INSIGHT, notification.getType());
    }

    @Test
    void testNotificationPreferenceEnumMapping() {
        NotificationPreference preference = new NotificationPreference();
        preference.setNotificationType(NotificationType.SECURITY_ALERT);
        assertEquals(NotificationType.SECURITY_ALERT, preference.getNotificationType());

        preference.setNotificationType(NotificationType.REWARD);
        assertEquals(NotificationType.REWARD, preference.getNotificationType());
    }
}
