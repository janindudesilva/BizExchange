package com.businessexchange.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class RateLimiterFilter extends OncePerRequestFilter {

    private static final int AUTH_LIMIT_PER_MINUTE = 15;
    private static final int UPLOAD_LIMIT_PER_MINUTE = 20;
    private static final int GENERAL_LIMIT_PER_MINUTE = 150;
    private static final long WINDOW_MILLIS = 60_000L;

    private final Map<String, WindowCounter> requestCounts = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private volatile long lastCleanupTime = System.currentTimeMillis();

    @org.springframework.beans.factory.annotation.Value("${app.security.trust-forwarded-headers:false}")
    private boolean trustForwardedHeaders = false;

    public void setTrustForwardedHeaders(boolean trustForwardedHeaders) {
        this.trustForwardedHeaders = trustForwardedHeaders;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        periodicCleanup();

        String clientIp = getClientIp(request);
        String requestUri = request.getRequestURI();
        String method = request.getMethod();

        int limit = resolveLimit(requestUri, method);
        String key = clientIp + ":" + (limit == AUTH_LIMIT_PER_MINUTE ? "auth" : (limit == UPLOAD_LIMIT_PER_MINUTE ? "upload" : "gen"));

        long now = System.currentTimeMillis();
        WindowCounter counter = requestCounts.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStartTime >= WINDOW_MILLIS) {
                return new WindowCounter(now, new AtomicInteger(1));
            }
            existing.counter.incrementAndGet();
            return existing;
        });

        if (counter.counter.get() > limit) {
            log.warn("Rate limit exceeded for IP: {} on URI: {}", clientIp, requestUri);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", "60");

            java.util.Map<String, Object> body = new java.util.LinkedHashMap<>();
            body.put("success", false);
            body.put("message", "Too many requests. Please wait a moment and try again.");
            body.put("data", null);
            response.getWriter().write(objectMapper.writeValueAsString(body));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private int resolveLimit(String uri, String method) {
        if (uri.startsWith("/api/auth/login")
                || uri.startsWith("/api/auth/register")
                || uri.startsWith("/api/auth/forgot-password")
                || uri.startsWith("/api/auth/verify-reset-otp")
                || uri.startsWith("/api/auth/password")
                || uri.startsWith("/api/auth/resend-verification")) {
            return AUTH_LIMIT_PER_MINUTE;
        }
        if ("POST".equalsIgnoreCase(method) && uri.matches(".*/api/businesses/[0-9]+/files.*")) {
            return UPLOAD_LIMIT_PER_MINUTE;
        }
        return GENERAL_LIMIT_PER_MINUTE;
    }

    private String getClientIp(HttpServletRequest request) {
        if (!trustForwardedHeaders) {
            return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
        }
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isBlank()) {
            return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
        }
        return xfHeader.split(",")[0].trim();
    }

    private static final int MAX_TRACKED_ENTRIES = 20_000;

    private void periodicCleanup() {
        long now = System.currentTimeMillis();
        if (requestCounts.size() >= MAX_TRACKED_ENTRIES || now - lastCleanupTime > WINDOW_MILLIS * 2) {
            lastCleanupTime = now;
            requestCounts.entrySet().removeIf(entry -> now - entry.getValue().windowStartTime > WINDOW_MILLIS);
            if (requestCounts.size() >= MAX_TRACKED_ENTRIES) {
                int toRemove = (requestCounts.size() - MAX_TRACKED_ENTRIES) + 100;
                var iterator = requestCounts.keySet().iterator();
                while (iterator.hasNext() && toRemove > 0) {
                    iterator.next();
                    iterator.remove();
                    toRemove--;
                }
            }
        }
    }

    public int getTrackedEntriesCount() {
        return requestCounts.size();
    }

    private static class WindowCounter {
        final long windowStartTime;
        final AtomicInteger counter;

        WindowCounter(long windowStartTime, AtomicInteger counter) {
            this.windowStartTime = windowStartTime;
            this.counter = counter;
        }
    }
}
