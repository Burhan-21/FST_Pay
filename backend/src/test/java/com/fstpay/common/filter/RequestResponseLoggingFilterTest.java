package com.fstpay.common.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RequestResponseLoggingFilterTest {

    private RequestResponseLoggingFilter loggingFilter;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        loggingFilter = new RequestResponseLoggingFilter();
        filterChain = mock(FilterChain.class);
        // Default to dev profile
        ReflectionTestUtils.setField(loggingFilter, "activeProfile", "dev");
    }

    @Test
    void whenActuatorPath_thenSkipLoggingAndWrapperCreation() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/actuator/health");
        MockHttpServletResponse response = new MockHttpServletResponse();

        loggingFilter.doFilterInternal(request, response, filterChain);

        // Verify that standard mock request and response were passed directly without caching wrappers
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    void whenNormalPathInDev_thenLogBothRequestAndResponseBodyAndCopy() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        String reqJson = "{\"email\":\"teen@fstpay.com\",\"password\":\"supersecret123\"}";
        request.setContent(reqJson.getBytes());
        request.setContentType("application/json");

        MockHttpServletResponse response = new MockHttpServletResponse();
        
        doAnswer(invocation -> {
            // Write some response content inside filter chain
            jakarta.servlet.http.HttpServletResponse resp = invocation.getArgument(1);
            resp.getWriter().write("{\"token\":\"jwt-secret-xyz\",\"status\":\"SUCCESS\"}");
            resp.setStatus(200);
            return null;
        }).when(filterChain).doFilter(any(), any());

        loggingFilter.doFilterInternal(request, response, filterChain);

        // Verify body copy was successful and response is populated
        assertEquals("{\"token\":\"jwt-secret-xyz\",\"status\":\"SUCCESS\"}", response.getContentAsString());
    }

    @Test
    void whenMaskingSensitiveData_thenMaskRegexReplacesCorrectly() {
        String input = "{\"email\":\"teen@fstpay.com\",\"password\":\"123456\",\"otp\":\"9999\",\"token\":\"my-jwt-token\"}";
        String result = (String) ReflectionTestUtils.invokeMethod(loggingFilter, "maskSensitiveData", input);
        
        assertNotNull(result);
        assertTrue(result.contains("\"password\":\"[MASKED]\""));
        assertTrue(result.contains("\"otp\":\"[MASKED]\""));
        assertTrue(result.contains("\"token\":\"[MASKED]\""));
        assertTrue(result.contains("\"email\":\"teen@fstpay.com\""));
    }

    @Test
    void whenLargePayload_thenTruncateCorrectly() {
        StringBuilder largeBody = new StringBuilder();
        for (int i = 0; i < 300; i++) {
            largeBody.append("some-long-repeated-data-string-");
        }
        String bodyStr = largeBody.toString();
        assertTrue(bodyStr.length() > 2048);

        String result = (String) ReflectionTestUtils.invokeMethod(loggingFilter, "getBody", bodyStr.getBytes(), "UTF-8");
        assertNotNull(result);
        assertTrue(result.endsWith("... [TRUNCATED]"));
        assertEquals(2048 + "... [TRUNCATED]".length(), result.length());
    }

    @Test
    void whenProdProfile_thenDoNotLogResponseBodies() throws ServletException, IOException {
        ReflectionTestUtils.setField(loggingFilter, "activeProfile", "prod");

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        request.setContent("{\"email\":\"teen@fstpay.com\"}".getBytes());
        MockHttpServletResponse response = new MockHttpServletResponse();

        doAnswer(invocation -> {
            jakarta.servlet.http.HttpServletResponse resp = invocation.getArgument(1);
            resp.getWriter().write("{\"token\":\"sensitive-token\"}");
            return null;
        }).when(filterChain).doFilter(any(), any());

        // This should run without throwing errors, and logging should suppress response body
        assertDoesNotThrow(() -> loggingFilter.doFilterInternal(request, response, filterChain));
        assertEquals("{\"token\":\"sensitive-token\"}", response.getContentAsString());
    }
}
