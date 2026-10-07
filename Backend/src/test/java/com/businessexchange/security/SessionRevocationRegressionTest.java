package com.businessexchange.security;

import com.businessexchange.auth.security.JwtService;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class SessionRevocationRegressionTest {

    private JwtService jwtService;
    private User testUser;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "jwtSecret", "DEVELOPMENT_AND_TEST_SECRET_AT_LEAST_32_BYTES_LONG_FOR_HMAC_SHA256");
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 86400000L);

        testUser = User.builder()
                .id(99L)
                .email("user@bizexchange.com")
                .role(UserRole.BUYER)
                .tokenVersion(0)
                .build();
    }

    @Test
    @DisplayName("TASK 6: Tokens issued before a password change become immediately invalid after token version increment")
    void testSessionInvalidationOnPasswordChange() {
        // Step 1: User logs in and receives token for tokenVersion = 0
        String initialToken = jwtService.generateToken(testUser);
        assertNotNull(initialToken);
        assertTrue(jwtService.isTokenValid(initialToken, testUser), "Initial token should be valid");

        // Step 2: User changes password or completes password reset, incrementing tokenVersion
        testUser.setTokenVersion(testUser.getTokenVersion() + 1); // now tokenVersion = 1

        // Step 3: Previously issued token must now fail validation
        boolean isValidAfterPasswordChange = jwtService.isTokenValid(initialToken, testUser);
        assertFalse(isValidAfterPasswordChange, "Old token must be rejected after password change/reset");

        // Step 4: A freshly issued token with new tokenVersion = 1 must succeed
        String newToken = jwtService.generateToken(testUser);
        assertTrue(jwtService.isTokenValid(newToken, testUser), "New session token must be valid");
    }
}
