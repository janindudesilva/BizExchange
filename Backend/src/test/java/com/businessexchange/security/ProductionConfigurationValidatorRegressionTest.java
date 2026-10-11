package com.businessexchange.security;

import com.businessexchange.common.config.ProductionConfigurationValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

public class ProductionConfigurationValidatorRegressionTest {

    private ProductionConfigurationValidator createValidator(MockEnvironment env, String jwt, String dbPass, String adminPass, String frontendUrl, boolean testMailbox, String cors) {
        ProductionConfigurationValidator validator = new ProductionConfigurationValidator(env);
        ReflectionTestUtils.setField(validator, "jwtSecret", jwt);
        ReflectionTestUtils.setField(validator, "dbPassword", dbPass);
        ReflectionTestUtils.setField(validator, "adminPassword", adminPass);
        ReflectionTestUtils.setField(validator, "frontendUrl", frontendUrl);
        ReflectionTestUtils.setField(validator, "testMailboxEnabled", testMailbox);
        ReflectionTestUtils.setField(validator, "corsAllowedOrigins", cors);
        ReflectionTestUtils.setField(validator, "validationEnabled", true);
        return validator;
    }

    @Test
    @DisplayName("Production: Rejects placeholder JWT secret")
    void testRejectsPlaceholderJwtSecret() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        ProductionConfigurationValidator validator = createValidator(
                env,
                "your-256-bit-secret-key-change-this-in-production-min-32-chars",
                "StrongSecretPass123!",
                "StrongAdminPass123!",
                "https://staging.bizexchange.lk",
                false,
                "https://staging.bizexchange.lk"
        );

        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::validate);
        assertTrue(ex.getMessage().contains("Known placeholder or default JWT secret detected"));
    }

    @Test
    @DisplayName("Production: Rejects short JWT secret (< 32 chars)")
    void testRejectsShortJwtSecret() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        ProductionConfigurationValidator validator = createValidator(
                env,
                "short-secret-1234",
                "StrongSecretPass123!",
                "StrongAdminPass123!",
                "https://staging.bizexchange.lk",
                false,
                "https://staging.bizexchange.lk"
        );

        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::validate);
        assertTrue(ex.getMessage().contains("JWT_SECRET must be at least 32 characters"));
    }

    @Test
    @DisplayName("Production: Rejects accidental test mailbox enablement")
    void testRejectsAccidentalTestMailbox() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("production");

        ProductionConfigurationValidator validator = createValidator(
                env,
                "ValidProductionSecretKeyAtLeast32BytesLong!",
                "StrongSecretPass123!",
                "StrongAdminPass123!",
                "https://staging.bizexchange.lk",
                true,
                "https://staging.bizexchange.lk"
        );

        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::validate);
        assertTrue(ex.getMessage().contains("Test mailbox (app.test-mailbox.enabled=true) is strictly forbidden"));
    }

    @Test
    @DisplayName("Production: Rejects localhost frontend URL")
    void testRejectsLocalhostFrontendUrl() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        ProductionConfigurationValidator validator = createValidator(
                env,
                "ValidProductionSecretKeyAtLeast32BytesLong!",
                "StrongSecretPass123!",
                "StrongAdminPass123!",
                "http://localhost:3000",
                false,
                "https://staging.bizexchange.lk"
        );

        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::validate);
        assertTrue(ex.getMessage().contains("cannot point to localhost"));
    }

    @Test
    @DisplayName("Production: Rejects wildcard CORS origin")
    void testRejectsWildcardCors() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("staging");

        ProductionConfigurationValidator validator = createValidator(
                env,
                "ValidProductionSecretKeyAtLeast32BytesLong!",
                "StrongSecretPass123!",
                "StrongAdminPass123!",
                "https://staging.bizexchange.lk",
                false,
                "*"
        );

        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::validate);
        assertTrue(ex.getMessage().contains("Wildcard '*' CORS origin is forbidden"));
    }

    @Test
    @DisplayName("Production: Passes with valid production configuration")
    void testPassesWithValidConfiguration() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        ProductionConfigurationValidator validator = createValidator(
                env,
                "ValidProductionSecretKeyAtLeast32BytesLong!",
                "StrongDatabasePassword123#Secure",
                "SuperAdminProdPassword2026!Secure",
                "https://staging.bizexchange.lk",
                false,
                "https://staging.bizexchange.lk"
        );

        assertDoesNotThrow(validator::validate);
    }

    @Test
    @DisplayName("Local/Dev: Does not enforce production requirements on dev profile")
    void testBypassesValidationOnDevProfile() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev", "local");

        ProductionConfigurationValidator validator = createValidator(
                env,
                "your-256-bit-secret-key-change-this-in-production-min-32-chars",
                "postgres",
                "AdminPass123!",
                "http://localhost:3000",
                true,
                "http://localhost:3000"
        );

        assertDoesNotThrow(validator::validate);
    }
}
