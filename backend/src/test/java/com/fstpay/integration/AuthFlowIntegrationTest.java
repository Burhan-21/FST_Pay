package com.fstpay.integration;

import com.fstpay.auth.dto.LoginRequest;
import com.fstpay.auth.dto.RegisterRequest;
import com.fstpay.common.dto.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class AuthFlowIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    @Test
    void registerUser_shouldSucceed() {
        RegisterRequest req = new RegisterRequest();
        req.setFullName("Integration Test");
        req.setEmail("register-" + System.currentTimeMillis() + "@test.com");
        req.setPassword("TestPass@123");
        req.setDateOfBirth(LocalDate.of(2005, 6, 15));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<RegisterRequest> entity = new HttpEntity<>(req, headers);
        ResponseEntity<ApiResponse> response = rest.postForEntity(
                "/api/v1/auth/register", entity, ApiResponse.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
    }

    @Test
    void register_WithUnderageUser_Rejected() {
        RegisterRequest req = new RegisterRequest();
        req.setFullName("Young User");
        req.setEmail("young-" + System.currentTimeMillis() + "@test.com");
        req.setPassword("TestPass@123");
        req.setDateOfBirth(LocalDate.now().minusYears(10));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<RegisterRequest> entity = new HttpEntity<>(req, headers);
        ResponseEntity<ApiResponse> response = rest.postForEntity(
                "/api/v1/auth/register", entity, ApiResponse.class);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
    }

    @Test
    void login_WithAdminUser_shouldSendOtp() {
        LoginRequest req = new LoginRequest();
        req.setEmail("admin@test.com");
        req.setPassword("Admin@123");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<LoginRequest> entity = new HttpEntity<>(req, headers);
        ResponseEntity<ApiResponse> response = rest.postForEntity(
                "/api/v1/auth/login", entity, ApiResponse.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
    }

    @Test
    void login_WithInvalidCredentials_Returns400() {
        LoginRequest req = new LoginRequest();
        req.setEmail("nonexistent@test.com");
        req.setPassword("WrongPass@123");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<LoginRequest> entity = new HttpEntity<>(req, headers);
        ResponseEntity<ApiResponse> response = rest.postForEntity(
                "/api/v1/auth/login", entity, ApiResponse.class);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void publicStats_shouldReturnOk() {
        ResponseEntity<ApiResponse> response = rest.getForEntity(
                "/api/v1/auth/stats", ApiResponse.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
    }
}
