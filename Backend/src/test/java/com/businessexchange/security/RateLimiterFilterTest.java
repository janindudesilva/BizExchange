package com.businessexchange.security;

import com.businessexchange.auth.security.RateLimiterFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RateLimiterFilterTest {

    private RateLimiterFilter rateLimiterFilter;

    @BeforeEach
    void setUp() {
        rateLimiterFilter = new RateLimiterFilter();
    }

    @Test
    @DisplayName("RATE LIMITER: Requests within allowed threshold pass through filter chain")
    void testRequestsWithinLimitAllowed() throws ServletException, IOException {
        FilterChain filterChain = mock(FilterChain.class);

        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
            request.setRemoteAddr("192.168.1.100");
            MockHttpServletResponse response = new MockHttpServletResponse();

            rateLimiterFilter.doFilter(request, response, filterChain);

            assertEquals(200, response.getStatus());
        }

        verify(filterChain, times(5)).doFilter(any(), any());
    }

    @Test
    @DisplayName("ATTACK: Brute force / credential stuffing exceeding 15 req/min is blocked with HTTP 429")
    void testRateLimitExceeded_BlockedWith429() throws ServletException, IOException {
        FilterChain filterChain = mock(FilterChain.class);
        String clientIp = "10.0.0.55";

        // Send 15 requests to reach the limit
        for (int i = 0; i < 15; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
            request.setRemoteAddr(clientIp);
            MockHttpServletResponse response = new MockHttpServletResponse();

            rateLimiterFilter.doFilter(request, response, filterChain);
            assertEquals(200, response.getStatus());
        }

        // 16th request from same IP must be throttled
        MockHttpServletRequest blockedRequest = new MockHttpServletRequest("POST", "/api/auth/login");
        blockedRequest.setRemoteAddr(clientIp);
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();

        rateLimiterFilter.doFilter(blockedRequest, blockedResponse, filterChain);

        assertEquals(429, blockedResponse.getStatus());
        assertEquals("60", blockedResponse.getHeader("Retry-After"));
        assertTrue(blockedResponse.getContentAsString().contains("Too many requests"));

        // Verify filterChain was NOT called for the 16th request
        verify(filterChain, times(15)).doFilter(any(), any());
    }

    @Test
    @DisplayName("DOS PROTECTION: Creating >20,000 unique client identifiers does not cause unbounded memory growth")
    void testMemoryTrackingBounded_Exceeding20kEntries() throws ServletException, IOException {
        FilterChain filterChain = mock(FilterChain.class);

        // Simulate 25,000 unique client IP addresses flooding the system
        for (int i = 0; i < 25_000; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/businesses");
            // Generate synthetic unique IPs
            int byte2 = (i >> 8) & 0xFF;
            int byte3 = i & 0xFF;
            request.setRemoteAddr("10.1." + byte2 + "." + byte3);
            MockHttpServletResponse response = new MockHttpServletResponse();

            rateLimiterFilter.doFilter(request, response, filterChain);
        }

        // Must not exceed MAX_TRACKED_ENTRIES (20,000)
        int trackedCount = rateLimiterFilter.getTrackedEntriesCount();
        assertTrue(trackedCount <= 20_000,
                "Tracked entries (" + trackedCount + ") must remain bounded <= 20,000 to prevent heap exhaustion");
    }

    @Test
    @DisplayName("SPOOFING RESISTANCE: Attacker cannot bypass rate limit by rotating X-Forwarded-For headers when trust-proxy is false")
    void testSpoofedXForwardedForHeaderIgnoredByDefault() throws ServletException, IOException {
        FilterChain filterChain = mock(FilterChain.class);
        String realAttackerIp = "203.0.113.50";

        // Ensure trustForwardedHeaders is false (default)
        rateLimiterFilter.setTrustForwardedHeaders(false);

        // Attacker attempts to bypass rate limit by sending unique spoofed X-Forwarded-For headers
        for (int i = 0; i < 15; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
            request.setRemoteAddr(realAttackerIp);
            request.addHeader("X-Forwarded-For", "198.51.100." + i);
            MockHttpServletResponse response = new MockHttpServletResponse();

            rateLimiterFilter.doFilter(request, response, filterChain);
            assertEquals(200, response.getStatus());
        }

        // 16th request with another spoofed IP must still be throttled based on real remoteAddr
        MockHttpServletRequest request16 = new MockHttpServletRequest("POST", "/api/auth/login");
        request16.setRemoteAddr(realAttackerIp);
        request16.addHeader("X-Forwarded-For", "198.51.100.99");
        MockHttpServletResponse response16 = new MockHttpServletResponse();

        rateLimiterFilter.doFilter(request16, response16, filterChain);
        assertEquals(429, response16.getStatus(), "Rate limiter must block the 16th request based on real remoteAddr");
    }
}
