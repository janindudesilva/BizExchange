package com.businessexchange.security;

import com.businessexchange.auth.security.JwtAuthFilter;
import com.businessexchange.auth.security.JwtService;
import com.businessexchange.auth.security.UserDetailsServiceImpl;
import com.businessexchange.auth.security.UserPrincipal;
import com.businessexchange.user.entity.AccountStatus;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtSuspensionRegressionTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private UserDetailsServiceImpl userDetailsService;

    @InjectMocks
    private JwtAuthFilter jwtAuthFilter;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();

        sampleUser = new User();
        sampleUser.setId(10L);
        sampleUser.setEmail("victim@bizexchange.com");
        sampleUser.setRole(UserRole.BUYER);
        sampleUser.setEmailVerified(true);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("ATTACK: Suspended user attempting to use previously issued valid JWT must be rejected")
    void testSuspendedUserJwtRejected() throws ServletException, IOException {
        sampleUser.setStatus(AccountStatus.SUSPENDED);

        String validToken = "valid.jwt.token";
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/businesses");
        request.addHeader("Authorization", "Bearer " + validToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        when(jwtService.extractEmail(validToken)).thenReturn(sampleUser.getEmail());
        when(userDetailsService.loadUserByUsername(sampleUser.getEmail())).thenReturn(new UserPrincipal(sampleUser));

        jwtAuthFilter.doFilter(request, response, filterChain);

        // Crucial security invariant: Authentication must NOT be set into SecurityContext
        assertNull(SecurityContextHolder.getContext().getAuthentication(),
                "Suspended user must not be authenticated even with a cryptographically valid JWT");
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("AUTHENTICATION: Active user with valid JWT is successfully authenticated")
    void testActiveUserJwtAccepted() throws ServletException, IOException {
        sampleUser.setStatus(AccountStatus.ACTIVE);

        String validToken = "valid.jwt.token";
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/businesses");
        request.addHeader("Authorization", "Bearer " + validToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        when(jwtService.extractEmail(validToken)).thenReturn(sampleUser.getEmail());
        when(userDetailsService.loadUserByUsername(sampleUser.getEmail())).thenReturn(new UserPrincipal(sampleUser));
        when(jwtService.isTokenValid(validToken, sampleUser)).thenReturn(true);

        jwtAuthFilter.doFilter(request, response, filterChain);

        assertNotNull(SecurityContextHolder.getContext().getAuthentication(),
                "Active user must be authenticated into SecurityContext");
        assertEquals(sampleUser.getEmail(), SecurityContextHolder.getContext().getAuthentication().getName());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("SECURITY: Unverified user JWT is rejected even if account status is ACTIVE")
    void testUnverifiedUserJwtRejected() throws ServletException, IOException {
        sampleUser.setStatus(AccountStatus.ACTIVE);
        sampleUser.setEmailVerified(false);

        String validToken = "valid.jwt.token";
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/businesses");
        request.addHeader("Authorization", "Bearer " + validToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        when(jwtService.extractEmail(validToken)).thenReturn(sampleUser.getEmail());
        when(userDetailsService.loadUserByUsername(sampleUser.getEmail())).thenReturn(new UserPrincipal(sampleUser));

        jwtAuthFilter.doFilter(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication(),
                "Unverified user must not be authenticated even with a cryptographically valid JWT");
        verify(filterChain).doFilter(request, response);
    }
}
