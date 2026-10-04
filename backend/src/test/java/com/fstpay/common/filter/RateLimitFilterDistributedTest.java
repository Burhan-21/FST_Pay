package com.fstpay.common.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.Duration;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RateLimitFilterDistributedTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @InjectMocks
    private RateLimitFilter rateLimitFilter;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(rateLimitFilter, "authLimit", 10);
        ReflectionTestUtils.setField(rateLimitFilter, "authWindowMinutes", 1);
        ReflectionTestUtils.setField(rateLimitFilter, "aiLimit", 20);
        ReflectionTestUtils.setField(rateLimitFilter, "aiWindowMinutes", 1);
        ReflectionTestUtils.setField(rateLimitFilter, "generalLimit", 150);
        ReflectionTestUtils.setField(rateLimitFilter, "generalWindowMinutes", 1);
        ReflectionTestUtils.setField(rateLimitFilter, "registerMaxPerIP", 5);
        ReflectionTestUtils.setField(rateLimitFilter, "cacheMaxSize", 1000);
        ReflectionTestUtils.setField(rateLimitFilter, "trustXForwardedFor", false);
        rateLimitFilter.initCache();
    }

    @Test
    @DisplayName("Distributed Redis: Increments counter and allows request within limit")
    void testDistributedRateLimiting_AllowsWithinLimit() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(request.getRequestURI()).thenReturn("/api/v1/auth/login");
        when(request.getRemoteAddr()).thenReturn("192.168.1.100");
        when(valueOperations.increment(eq("rate_limit:auth:192.168.1.100"), eq(1L))).thenReturn(1L);

        rateLimitFilter.doFilterInternal(request, response, filterChain);

        verify(valueOperations).increment("rate_limit:auth:192.168.1.100", 1L);
        verify(redisTemplate).expire(eq("rate_limit:auth:192.168.1.100"), any(Duration.class));
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Distributed Redis: Blocks request with 429 when counter exceeds limit")
    void testDistributedRateLimiting_BlocksExceededLimit() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(request.getRequestURI()).thenReturn("/api/v1/auth/login");
        when(request.getRemoteAddr()).thenReturn("192.168.1.100");
        // Count exceeds authLimit of 10
        when(valueOperations.increment(eq("rate_limit:auth:192.168.1.100"), eq(1L))).thenReturn(11L);

        StringWriter out = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(out));

        rateLimitFilter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(429);
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("Distributed Redis: Stricter limit enforced for account registration")
    void testDistributedRateLimiting_RegisterEndpoint() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(request.getRequestURI()).thenReturn("/api/v1/auth/register");
        when(request.getRemoteAddr()).thenReturn("192.168.1.200");
        when(valueOperations.increment(eq("rate_limit:register:192.168.1.200"), eq(1L))).thenReturn(6L); // exceeds 5

        StringWriter out = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(out));

        rateLimitFilter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(429);
    }

    @Test
    @DisplayName("Fallback: When Redis throws an error, falls back to in-memory bucket seamlessly")
    void testFallbackToInMemoryWhenRedisFails() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(request.getRequestURI()).thenReturn("/api/v1/wallet");
        when(request.getRemoteAddr()).thenReturn("10.0.0.1");
        when(valueOperations.increment(anyString(), anyLong()))
                .thenThrow(new org.springframework.data.redis.RedisConnectionFailureException("Redis unreachable"));

        rateLimitFilter.doFilterInternal(request, response, filterChain);

        // Should fall back to in-memory bucket and proceed
        verify(filterChain).doFilter(request, response);
    }
}
