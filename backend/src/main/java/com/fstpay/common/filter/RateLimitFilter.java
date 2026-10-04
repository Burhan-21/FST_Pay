package com.fstpay.common.filter;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    @Value("${app.rate-limit.auth-requests:10}")
    private int authLimit;

    @Value("${app.rate-limit.auth-window-minutes:1}")
    private int authWindowMinutes;

    @Value("${app.rate-limit.ai-requests:20}")
    private int aiLimit;

    @Value("${app.rate-limit.ai-window-minutes:1}")
    private int aiWindowMinutes;

    @Value("${app.rate-limit.general-requests:150}")
    private int generalLimit;

    @Value("${app.rate-limit.general-window-minutes:1}")
    private int generalWindowMinutes;

    @Value("${app.rate-limit.cache-max-size:10000}")
    private int cacheMaxSize;

    @Value("${app.rate-limit.trust-x-forwarded-for:false}")
    private boolean trustXForwardedFor;

    @Value("${app.rate-limit.register-max-per-ip-hour:5}")
    private int registerMaxPerIP;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    private Map<String, Bucket> cache;

    @PostConstruct
    public void initCache() {
        this.cache = Collections.synchronizedMap(
                new LinkedHashMap<String, Bucket>(cacheMaxSize, 0.75f, true) {
                    @Override
                    protected boolean removeEldestEntry(Map.Entry eldest) {
                        return size() > cacheMaxSize;
                    }
                }
        );
    }

    private boolean isAllowed(String ip, String path) {
        if (redisTemplate != null) {
            try {
                String endpointType = getEndpointType(path);
                int limit;
                long windowSeconds;

                if (path.startsWith("/api/v1/auth/register")) {
                    limit = registerMaxPerIP;
                    windowSeconds = 3600;
                    endpointType = "register";
                } else if (path.startsWith("/api/v1/auth")) {
                    limit = authLimit;
                    windowSeconds = (long) authWindowMinutes * 60;
                } else if (path.startsWith("/api/v1/ai")) {
                    limit = aiLimit;
                    windowSeconds = (long) aiWindowMinutes * 60;
                } else {
                    limit = generalLimit;
                    windowSeconds = (long) generalWindowMinutes * 60;
                }

                String redisKey = "rate_limit:" + endpointType + ":" + ip;
                Long currentCount = redisTemplate.opsForValue().increment(redisKey, 1);
                if (currentCount != null && currentCount == 1) {
                    redisTemplate.expire(redisKey, Duration.ofSeconds(windowSeconds));
                }

                if (currentCount != null && currentCount > limit) {
                    return false;
                }
                return true;
            } catch (Exception e) {
                log.warn("Redis distributed rate limit error, falling back to in-memory bucket: {}", e.getMessage());
            }
        }

        Bucket bucket = getBucketForIp(ip, path);
        return bucket.tryConsume(1);
    }

    private Bucket getBucketForIp(String ip, String path) {
        String bucketKey = ip + ":" + getEndpointType(path);
        
        return cache.computeIfAbsent(bucketKey, k -> {
            if (path.startsWith("/api/v1/auth/register")) {
                return Bucket.builder()
                        .addLimit(Bandwidth.classic(registerMaxPerIP, Refill.greedy(registerMaxPerIP, Duration.ofHours(1))))
                        .build();
            } else if (path.startsWith("/api/v1/auth")) {
                return Bucket.builder()
                        .addLimit(Bandwidth.classic(authLimit, Refill.greedy(authLimit, Duration.ofMinutes(authWindowMinutes))))
                        .build();
            } else if (path.startsWith("/api/v1/ai")) {
                return Bucket.builder()
                        .addLimit(Bandwidth.classic(aiLimit, Refill.greedy(aiLimit, Duration.ofMinutes(aiWindowMinutes))))
                        .build();
            } else {
                return Bucket.builder()
                        .addLimit(Bandwidth.classic(generalLimit, Refill.greedy(generalLimit, Duration.ofMinutes(generalWindowMinutes))))
                        .build();
            }
        });
    }

    private String getEndpointType(String path) {
        if (path.startsWith("/api/v1/auth")) return "auth";
        if (path.startsWith("/api/v1/ai")) return "ai";
        return "general";
    }

    private String getClientIP(HttpServletRequest request) {
        if (trustXForwardedFor) {
            String xfHeader = request.getHeader("X-Forwarded-For");
            if (xfHeader != null && !xfHeader.isEmpty()) {
                String[] ips = xfHeader.split(",");
                return ips[0].trim();
            }
        }
        return request.getRemoteAddr();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String path = request.getRequestURI();
        
        // Skip rate limiting for static assets and health probes
        if (path.startsWith("/actuator") || path.equals("/") || path.startsWith("/static/")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String ip = getClientIP(request);

            if (isAllowed(ip, path)) {
                filterChain.doFilter(request, response);
            } else {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType("application/json");
                response.getWriter().write("{\"success\":false,\"message\":\"Too many requests. Please try again later.\"}");
                log.warn("Rate limit exceeded for IP: {} on path: {}", ip, path);
            }
        } catch (Exception e) {
            log.error("Error in rate limiting filter", e);
            filterChain.doFilter(request, response);
        }
    }
}
