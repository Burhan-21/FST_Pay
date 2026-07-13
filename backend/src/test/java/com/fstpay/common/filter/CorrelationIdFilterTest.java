package com.fstpay.common.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CorrelationIdFilterTest {

    private CorrelationIdFilter correlationIdFilter;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        correlationIdFilter = new CorrelationIdFilter();
        filterChain = mock(FilterChain.class);
        MDC.clear();
    }

    @Test
    void whenCorrelationIdPresent_thenReuseItAndPopulateMdcAndResponse() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        
        String testCorrelationId = "test-corr-id-123";
        request.addHeader(CorrelationIdFilter.CORRELATION_HEADER, testCorrelationId);

        // We verify MDC inside the filter execution by asserting it inside a mock FilterChain doFilter callback
        doAnswer(invocation -> {
            assertEquals(testCorrelationId, MDC.get(CorrelationIdFilter.MDC_KEY));
            return null;
        }).when(filterChain).doFilter(request, response);

        correlationIdFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(1)).doFilter(request, response);
        assertEquals(testCorrelationId, response.getHeader(CorrelationIdFilter.CORRELATION_HEADER));
        assertNull(MDC.get(CorrelationIdFilter.MDC_KEY), "MDC should be cleared after doFilter completes");
    }

    @Test
    void whenCorrelationIdMissing_thenGenerateUuidAndPopulateMdcAndResponse() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        doAnswer(invocation -> {
            String mdcVal = MDC.get(CorrelationIdFilter.MDC_KEY);
            assertNotNull(mdcVal);
            assertDoesNotThrow(() -> java.util.UUID.fromString(mdcVal));
            return null;
        }).when(filterChain).doFilter(request, response);

        correlationIdFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(1)).doFilter(request, response);
        
        String responseHeader = response.getHeader(CorrelationIdFilter.CORRELATION_HEADER);
        assertNotNull(responseHeader);
        assertDoesNotThrow(() -> java.util.UUID.fromString(responseHeader));
        assertNull(MDC.get(CorrelationIdFilter.MDC_KEY), "MDC should be cleared after doFilter completes");
    }
}
