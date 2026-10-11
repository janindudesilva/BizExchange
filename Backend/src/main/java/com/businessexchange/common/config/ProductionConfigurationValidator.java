package com.businessexchange.common.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Strict fail-fast validator that executes during application bootstrap.
 * In production or staging profiles, it prevents application startup if insecure,
 * placeholder, or localhost configuration values are detected.
 */
@Component
@Slf4j
public class ProductionConfigurationValidator {

    private final Environment environment;

    @Value("${jwt.secret:#{null}}")
    private String jwtSecret;

    @Value("${spring.datasource.password:#{null}}")
    private String dbPassword;

    @Value("${app.admin.password:#{null}}")
    private String adminPassword;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${app.test-mailbox.enabled:false}")
    private boolean testMailboxEnabled;

    @Value("${cors.allowed-origins:http://localhost:3000}")
    private String corsAllowedOrigins;

    @Value("${app.production.validation.enabled:true}")
    private boolean validationEnabled;

    public ProductionConfigurationValidator(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    public void validate() {
        if (!validationEnabled) {
            return;
        }

        List<String> activeProfiles = Arrays.asList(environment.getActiveProfiles());
        boolean isProduction = activeProfiles.contains("prod") || activeProfiles.contains("production");
        boolean isStaging = activeProfiles.contains("staging");

        if (!isProduction && !isStaging) {
            return;
        }

        log.info("Running strict production configuration validation for active profile(s): {}", activeProfiles);

        // 1. Strict prohibition of test mailbox in production and staging
        if (testMailboxEnabled) {
            throw new IllegalStateException("CRITICAL SECURITY VIOLATION: Test mailbox (app.test-mailbox.enabled=true) " +
                    "is strictly forbidden in production and staging environments. Startup aborted.");
        }

        // 2. Validate JWT Secret length and reject known placeholders
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("CRITICAL CONFIGURATION ERROR: JWT_SECRET must be supplied in production/staging.");
        }
        if (jwtSecret.length() < 32) {
            throw new IllegalStateException("CRITICAL CONFIGURATION ERROR: JWT_SECRET must be at least 32 characters (256 bits). Current length: " + jwtSecret.length());
        }
        String lowerSecret = jwtSecret.toLowerCase();
        if (lowerSecret.contains("change-this-in-production")
                || lowerSecret.contains("replace_before_production")
                || lowerSecret.equals("your-256-bit-secret-key-change-this-in-production-min-32-chars")
                || lowerSecret.equals("local_dev_secret_replace_before_production_at_least_32b")
                || lowerSecret.equals("secret")
                || lowerSecret.equals("password")
                || lowerSecret.equals("admin")
                || lowerSecret.equals("changeme")) {
            throw new IllegalStateException("CRITICAL SECURITY VIOLATION: Known placeholder or default JWT secret detected in production/staging. Startup aborted.");
        }

        // 3. Validate Database Password
        if (dbPassword != null && !dbPassword.isBlank()) {
            String lowerDbPass = dbPassword.toLowerCase();
            if (lowerDbPass.equals("postgres")
                    || lowerDbPass.equals("password")
                    || lowerDbPass.equals("your_secure_db_password")) {
                throw new IllegalStateException("CRITICAL SECURITY VIOLATION: Insecure or placeholder database password detected in production/staging.");
            }
        }

        // 4. Validate Administrator Password
        if (adminPassword != null && !adminPassword.isBlank()) {
            String lowerAdminPass = adminPassword.toLowerCase();
            if (lowerAdminPass.equals("admin")
                    || lowerAdminPass.equals("adminpass123!")
                    || lowerAdminPass.equals("yourstrongadminpassword123!")
                    || lowerAdminPass.equals("password")) {
                throw new IllegalStateException("CRITICAL SECURITY VIOLATION: Insecure or placeholder administrator password detected in production/staging.");
            }
        }

        // 5. Validate Frontend URL (cannot point to localhost in production/staging)
        if (frontendUrl == null || frontendUrl.isBlank()) {
            throw new IllegalStateException("CRITICAL CONFIGURATION ERROR: FRONTEND_URL (app.frontend.url) must be set in production/staging.");
        }
        String lowerFrontendUrl = frontendUrl.toLowerCase();
        if (lowerFrontendUrl.contains("localhost") || lowerFrontendUrl.contains("127.0.0.1")) {
            throw new IllegalStateException("CRITICAL CONFIGURATION ERROR: FRONTEND_URL (app.frontend.url) cannot point to localhost in production/staging. Configured value: " + frontendUrl);
        }
        if (!lowerFrontendUrl.startsWith("http://") && !lowerFrontendUrl.startsWith("https://")) {
            throw new IllegalStateException("CRITICAL CONFIGURATION ERROR: FRONTEND_URL must be an absolute URL starting with http:// or https://. Configured value: " + frontendUrl);
        }

        // 6. Validate CORS Allowed Origins
        if (corsAllowedOrigins != null) {
            if (corsAllowedOrigins.contains("*")) {
                throw new IllegalStateException("CRITICAL SECURITY VIOLATION: Wildcard '*' CORS origin is forbidden in production/staging.");
            }
            if (corsAllowedOrigins.trim().equals("http://localhost:3000")) {
                throw new IllegalStateException("CRITICAL CONFIGURATION ERROR: CORS allowed origins cannot be solely localhost:3000 in production/staging. Configured value: " + corsAllowedOrigins);
            }
        }

        log.info("Production configuration validation passed successfully.");
    }
}
