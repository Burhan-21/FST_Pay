package com.fstpay.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;

class ActuatorOpenApiIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    @Test
    void healthEndpoint_shouldBePublicAndReturnStatus() {
        ResponseEntity<String> response = rest.getForEntity("/actuator/health", String.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().contains("status") || response.getBody().contains("UP"));
    }

    @Test
    void openApiDocs_shouldBePublicAndReturnJson() {
        ResponseEntity<String> response = rest.getForEntity("/v3/api-docs", String.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().contains("openapi") || response.getBody().contains("FST Pay API"));
    }

    @Test
    void swaggerUi_shouldBePublicAndReturnHtml() {
        ResponseEntity<String> response = rest.getForEntity("/swagger-ui/index.html", String.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().contains("Swagger UI") || response.getBody().contains("html"));
    }
}
