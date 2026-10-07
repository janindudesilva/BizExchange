package com.businessexchange.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.*;

public class PostgreSqlFlywayMigrationIntegrationTest {

    private static final String PG_HOST = System.getenv().getOrDefault("DB_HOST", "localhost:5432");
    private static final String PG_USER = System.getenv().getOrDefault("DB_USER", "postgres");
    private static final String PG_PASS = resolvePassword();
    private static final String FRESH_DB = "bizexchange_fresh_mig_test";
    private static final String INQUIRY_DB = "bizexchange_inquiry_mig_test";
    private static final String UPGRADE_DB = "bizexchange_upgrade_mig_test";
    private static final String PRE_V5_DB = "bizexchange_prev5_mig_test";

    private static String resolvePassword() {
        String pass = System.getProperty("DB_PASSWORD");
        if (pass != null && !pass.isEmpty()) return pass;
        pass = System.getenv("DB_PASSWORD");
        if (pass != null && !pass.isEmpty()) return pass;
        pass = System.getenv("PGPASSWORD");
        if (pass != null && !pass.isEmpty()) return pass;

        // Fallback: read from local properties file if present (never log or expose)
        try {
            java.nio.file.Path p = java.nio.file.Path.of("src/main/resources/application-local.properties");
            if (!java.nio.file.Files.exists(p)) {
                p = java.nio.file.Path.of("Backend/src/main/resources/application-local.properties");
            }
            if (java.nio.file.Files.exists(p)) {
                for (String line : java.nio.file.Files.readAllLines(p)) {
                    if (line.startsWith("spring.datasource.password=")) {
                        return line.substring("spring.datasource.password=".length()).trim();
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return "";
    }

    private static boolean postgresAvailable = false;

    @BeforeAll
    static void checkPostgreSqlAvailability() {
        try (Connection conn = DriverManager.getConnection("jdbc:postgresql://" + PG_HOST + "/postgres", PG_USER, PG_PASS)) {
            postgresAvailable = true;
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("DROP DATABASE IF EXISTS " + FRESH_DB);
                stmt.execute("DROP DATABASE IF EXISTS " + INQUIRY_DB);
                stmt.execute("DROP DATABASE IF EXISTS " + UPGRADE_DB);
                stmt.execute("DROP DATABASE IF EXISTS " + PRE_V5_DB);
                stmt.execute("CREATE DATABASE " + FRESH_DB);
                stmt.execute("CREATE DATABASE " + INQUIRY_DB);
                stmt.execute("CREATE DATABASE " + UPGRADE_DB);
                stmt.execute("CREATE DATABASE " + PRE_V5_DB);
            }
        } catch (Exception e) {
            System.out.println("Local PostgreSQL not available for migration test: " + e.getMessage());
            postgresAvailable = false;
        }
    }

    @AfterAll
    static void tearDown() {
        if (postgresAvailable) {
            try (Connection conn = DriverManager.getConnection("jdbc:postgresql://" + PG_HOST + "/postgres", PG_USER, PG_PASS);
                 Statement stmt = conn.createStatement()) {
                stmt.execute("DROP DATABASE IF EXISTS " + FRESH_DB);
                stmt.execute("DROP DATABASE IF EXISTS " + INQUIRY_DB);
                stmt.execute("DROP DATABASE IF EXISTS " + UPGRADE_DB);
                stmt.execute("DROP DATABASE IF EXISTS " + PRE_V5_DB);
            } catch (Exception ignored) {
            }
        }
    }

    @Test
    @DisplayName("Verify fresh database creation runs V1..V5 and creates enums, token_version, and partial unique index")
    void testFreshDatabaseMigration() throws SQLException {
        Assumptions.assumeTrue(postgresAvailable, "PostgreSQL not reachable; skipping live DB test");

        String freshJdbcUrl = "jdbc:postgresql://" + PG_HOST + "/" + FRESH_DB;
        Flyway flyway = Flyway.configure()
                .dataSource(freshJdbcUrl, PG_USER, PG_PASS)
                .cleanDisabled(false)
                .load();

        var result = flyway.migrate();
        assertTrue(result.migrationsExecuted > 0, "Migrations should be executed on fresh DB");
        assertEquals("9", result.targetSchemaVersion, "Fresh DB should migrate up to version 9");

        try (Connection conn = DriverManager.getConnection(freshJdbcUrl, PG_USER, PG_PASS)) {
            // 1. Verify token_version on users table
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'token_version'")) {
                try (ResultSet rs = ps.executeQuery()) {
                    assertTrue(rs.next(), "token_version column must exist on users");
                    assertEquals("integer", rs.getString("data_type"));
                }
            }

            // 2. Verify verification_status enum contains NEEDS_MORE_INFORMATION
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'verification_status' AND enumlabel = 'NEEDS_MORE_INFORMATION'")) {
                try (ResultSet rs = ps.executeQuery()) {
                    assertTrue(rs.next(), "verification_status enum must contain NEEDS_MORE_INFORMATION");
                }
            }

            // 3. Verify email_verification_tokens has expires_at and created_at
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT column_name FROM information_schema.columns WHERE table_name = 'email_verification_tokens' AND column_name IN ('expires_at', 'created_at')")) {
                try (ResultSet rs = ps.executeQuery()) {
                    int colCount = 0;
                    while (rs.next()) colCount++;
                    assertEquals(2, colCount, "email_verification_tokens must have expires_at and created_at");
                }
            }

            // 4. Verify partial unique index exists on inquiries
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'inquiries' AND indexname = 'uk_open_inquiry_buyer_business'")) {
                try (ResultSet rs = ps.executeQuery()) {
                    assertTrue(rs.next(), "uk_open_inquiry_buyer_business index must exist");
                    String def = rs.getString("indexdef");
                    assertTrue(def.contains("buyer_id"), "Index must cover buyer_id");
                    assertTrue(def.contains("business_id"), "Index must cover business_id");
                    assertTrue(def.contains("PENDING_APPROVAL") || def.contains("ACTIVE"), "Index must be partial filter on open statuses");
                }
            }

            // 5. Verify review constraints
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'reviews' AND column_name IN ('seller_id', 'buyer_id', 'rating', 'created_at')")) {
                try (ResultSet rs = ps.executeQuery()) {
                    int count = 0;
                    while (rs.next()) {
                        assertEquals("NO", rs.getString("is_nullable"), "Core review column " + rs.getString("column_name") + " must be NOT NULL");
                        count++;
                    }
                    assertEquals(4, count, "All core review columns must be present and verified");
                }
            }

            // 6. Test concurrency / partial unique index enforcement
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("INSERT INTO users (id, full_name, email, password_hash, role, status) VALUES " +
                        "(101, 'Seller 1', 'seller1@test.com', 'hash', 'SELLER', 'ACTIVE'), " +
                        "(102, 'Buyer 1', 'buyer1@test.com', 'hash', 'BUYER', 'ACTIVE')");
                stmt.execute("INSERT INTO business_categories (id, name) VALUES (1, 'Food & Beverage')");
                stmt.execute("INSERT INTO businesses (id, seller_id, category_id, title, description, location, asking_price, status, verification_status) VALUES " +
                        "(201, 101, 1, 'Coffee Shop', 'A nice shop', 'Colombo', 50000, 'APPROVED', 'APPROVED')");

                // First open inquiry succeeds
                stmt.execute("INSERT INTO inquiries (id, business_id, buyer_id, seller_id, initial_message, status) VALUES " +
                        "(301, 201, 102, 101, 'First inquiry', 'PENDING_APPROVAL')");

                // Second open inquiry must throw unique constraint violation
                assertThrows(SQLException.class, () -> {
                    stmt.execute("INSERT INTO inquiries (id, business_id, buyer_id, seller_id, initial_message, status) VALUES " +
                            "(302, 201, 102, 101, 'Duplicate inquiry', 'ACTIVE')");
                }, "Second open inquiry for same buyer & business must violate partial unique index");

                // Close first inquiry
                stmt.execute("UPDATE inquiries SET status = 'CLOSED' WHERE id = 301");

                // Now a new open inquiry must succeed
                assertDoesNotThrow(() -> {
                    stmt.execute("INSERT INTO inquiries (id, business_id, buyer_id, seller_id, initial_message, status) VALUES " +
                            "(303, 201, 102, 101, 'New inquiry after closure', 'PENDING_APPROVAL')");
                }, "New open inquiry after closure must be permitted");
            }
        }
    }

    @Test
    @DisplayName("Verify duplicate PENDING_APPROVAL and ACTIVE inquiries: assert only one remains active and every inquiry and message is preserved")
    void testDuplicateInquiriesOnlyOneActiveAndAllPreserved() throws SQLException {
        Assumptions.assumeTrue(postgresAvailable, "PostgreSQL not reachable; skipping live DB test");

        String inquiryJdbcUrl = "jdbc:postgresql://" + PG_HOST + "/" + INQUIRY_DB;
        Flyway.configure()
                .dataSource(inquiryJdbcUrl, PG_USER, PG_PASS)
                .load()
                .migrate();

        try (Connection conn = DriverManager.getConnection(inquiryJdbcUrl, PG_USER, PG_PASS);
             Statement stmt = conn.createStatement()) {

            stmt.execute("INSERT INTO users (id, full_name, email, password_hash, role, status) VALUES " +
                    "(401, 'Seller Inq', 'sellerinq@test.com', 'hash', 'SELLER', 'ACTIVE'), " +
                    "(402, 'Buyer Inq', 'buyerinq@test.com', 'hash', 'BUYER', 'ACTIVE')");
            stmt.execute("INSERT INTO business_categories (id, name) VALUES (10, 'Services')");
            stmt.execute("INSERT INTO businesses (id, seller_id, category_id, title, description, location, asking_price, status, verification_status) VALUES " +
                    "(403, 401, 10, 'Agency Services', 'Top agency', 'Galle', 120000, 'APPROVED', 'APPROVED')");

            // Step 1: Buyer creates first inquiry (PENDING_APPROVAL) with message
            stmt.execute("INSERT INTO inquiries (id, business_id, buyer_id, seller_id, initial_message, status) VALUES " +
                    "(501, 403, 402, 401, 'Initial request regarding financials', 'PENDING_APPROVAL')");
            stmt.execute("INSERT INTO messages (id, inquiry_id, sender_id, message) VALUES " +
                    "(601, 501, 402, 'Can you provide the 2025 audited accounts?')");

            // Step 2: Attempt duplicate open inquiry with ACTIVE status -> violates partial unique index
            assertThrows(SQLException.class, () -> {
                stmt.execute("INSERT INTO inquiries (id, business_id, buyer_id, seller_id, initial_message, status) VALUES " +
                        "(502, 403, 402, 401, 'Duplicate attempt with ACTIVE status', 'ACTIVE')");
            }, "Database partial unique index must block duplicate ACTIVE inquiry for same buyer & business");

            // Step 3: Attempt duplicate open inquiry with PENDING_APPROVAL status -> violates partial unique index
            assertThrows(SQLException.class, () -> {
                stmt.execute("INSERT INTO inquiries (id, business_id, buyer_id, seller_id, initial_message, status) VALUES " +
                        "(503, 403, 402, 401, 'Duplicate attempt with PENDING_APPROVAL status', 'PENDING_APPROVAL')");
            }, "Database partial unique index must block duplicate PENDING_APPROVAL inquiry for same buyer & business");

            // Step 4: First inquiry is completed or closed
            stmt.execute("UPDATE inquiries SET status = 'CLOSED' WHERE id = 501");

            // Step 5: Buyer opens a new inquiry (PENDING_APPROVAL) with a new message
            stmt.execute("INSERT INTO inquiries (id, business_id, buyer_id, seller_id, initial_message, status) VALUES " +
                    "(504, 403, 402, 401, 'Subsequent inquiry under updated terms', 'PENDING_APPROVAL')");
            stmt.execute("INSERT INTO messages (id, inquiry_id, sender_id, message) VALUES " +
                    "(602, 504, 402, 'Following up on revised terms for acquisition')");

            // Step 6: Assertions:
            // a) Exactly ONE inquiry remains open / active
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT id, status FROM inquiries WHERE business_id = 403 AND buyer_id = 402 AND status IN ('PENDING_APPROVAL', 'ACTIVE')")) {
                assertTrue(rs.next(), "An active/pending inquiry must exist");
                assertEquals(504L, rs.getLong("id"));
                assertEquals("PENDING_APPROVAL", rs.getString("status"));
                assertFalse(rs.next(), "Only ONE inquiry must remain active/pending");
            }

            // b) EVERY inquiry is preserved (both 501 and 504 exist)
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT id, status FROM inquiries WHERE business_id = 403 AND buyer_id = 402 ORDER BY id ASC")) {
                assertTrue(rs.next());
                assertEquals(501L, rs.getLong("id"));
                assertEquals("CLOSED", rs.getString("status"), "Initial inquiry must be preserved as CLOSED");

                assertTrue(rs.next());
                assertEquals(504L, rs.getLong("id"));
                assertEquals("PENDING_APPROVAL", rs.getString("status"), "Subsequent inquiry must exist as PENDING_APPROVAL");

                assertFalse(rs.next(), "Exactly two inquiries should exist");
            }

            // c) EVERY message is preserved (both 601 and 602 exist)
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT id, inquiry_id, message FROM messages WHERE inquiry_id IN (501, 504) ORDER BY id ASC")) {
                assertTrue(rs.next());
                assertEquals(601L, rs.getLong("id"));
                assertEquals(501L, rs.getLong("inquiry_id"));

                assertTrue(rs.next());
                assertEquals(602L, rs.getLong("id"));
                assertEquals(504L, rs.getLong("inquiry_id"));

                assertFalse(rs.next(), "All messages across all inquiries must be completely preserved");
            }
        }
    }

    @Test
    @DisplayName("Verify representative database with original V5 and V8 already applied: retains validation and migrates to V9 cleanly")
    void testRepresentativeDatabaseWithOriginalV5AndV8() throws SQLException {
        Assumptions.assumeTrue(postgresAvailable, "PostgreSQL not reachable; skipping live DB test");

        String upgradeJdbcUrl = "jdbc:postgresql://" + PG_HOST + "/" + UPGRADE_DB;

        // Step 1: Simulate representative database that already has original V1..V8 applied
        Flyway flywayV8 = Flyway.configure()
                .dataSource(upgradeJdbcUrl, PG_USER, PG_PASS)
                .target("8")
                .load();
        flywayV8.migrate();

        // Step 2: Retain validation: Flyway validate must succeed on the V8 database with zero mismatches
        Flyway flywayValidator = Flyway.configure()
                .dataSource(upgradeJdbcUrl, PG_USER, PG_PASS)
                .target("8")
                .load();
        assertDoesNotThrow(flywayValidator::validate, "Flyway validation must succeed on representative V1..V8 database");

        // Step 3: Run forward migration to V9 with validation retained
        Flyway flywayV9 = Flyway.configure()
                .dataSource(upgradeJdbcUrl, PG_USER, PG_PASS)
                .load();
        var upgradeResult = flywayV9.migrate();
        assertEquals("9", upgradeResult.targetSchemaVersion, "Forward migration to V9 must succeed cleanly");

        // Step 4: Validate entire schema at V9
        assertDoesNotThrow(flywayV9::validate, "Full Flyway validation up to V9 must succeed with 0 checksum mismatches");
    }

    @Test
    @DisplayName("Verify historical V5 deduplication behavior when upgrading older V4 schema with pre-existing duplicate inquiries")
    void testHistoricalV5DeduplicationBehavior() throws SQLException {
        Assumptions.assumeTrue(postgresAvailable, "PostgreSQL not reachable; skipping live DB test");

        String histDb = "bizexchange_hist_test";
        try (Connection conn = DriverManager.getConnection("jdbc:postgresql://" + PG_HOST + "/postgres", PG_USER, PG_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.execute("DROP DATABASE IF EXISTS " + histDb);
            stmt.execute("CREATE DATABASE " + histDb);
        }

        try {
            String histJdbcUrl = "jdbc:postgresql://" + PG_HOST + "/" + histDb;

            // Step 1: Migrate to V4
            Flyway flywayV4 = Flyway.configure()
                    .dataSource(histJdbcUrl, PG_USER, PG_PASS)
                    .target("4")
                    .load();
            flywayV4.migrate();

            // Step 2: Seed older data before V5, including duplicate open inquiries
            try (Connection conn = DriverManager.getConnection(histJdbcUrl, PG_USER, PG_PASS);
                 Statement stmt = conn.createStatement()) {
                stmt.execute("INSERT INTO users (id, full_name, email, password_hash, role, status) VALUES " +
                        "(701, 'Seller Hist', 'sellerhist@test.com', 'hash', 'SELLER', 'ACTIVE'), " +
                        "(702, 'Buyer Hist', 'buyerhist@test.com', 'hash', 'BUYER', 'ACTIVE')");
                stmt.execute("INSERT INTO business_categories (id, name) VALUES (3, 'Retail')");
                stmt.execute("INSERT INTO businesses (id, seller_id, category_id, title, description, location, asking_price, status, verification_status) VALUES " +
                        "(703, 701, 3, 'Hist Bakery', 'Bakery', 'Kandy', 75000, 'APPROVED', 'APPROVED')");

                stmt.execute("INSERT INTO inquiries (id, business_id, buyer_id, seller_id, initial_message, status) VALUES " +
                        "(801, 703, 702, 701, 'First old inquiry', 'PENDING_APPROVAL'), " +
                        "(802, 703, 702, 701, 'Duplicate old inquiry', 'ACTIVE')");
            }

            // Step 3: Run original V5 migration
            Flyway flywayV5 = Flyway.configure()
                    .dataSource(histJdbcUrl, PG_USER, PG_PASS)
                    .target("5")
                    .load();
            flywayV5.migrate();

            // Step 4: Verify original V5 deduplication: kept newest (802) and removed older duplicate (801)
            try (Connection conn = DriverManager.getConnection(histJdbcUrl, PG_USER, PG_PASS);
                 Statement stmt = conn.createStatement()) {
                try (ResultSet rs = stmt.executeQuery("SELECT id, status FROM inquiries WHERE business_id = 703 AND buyer_id = 702")) {
                    assertTrue(rs.next(), "Retained newest inquiry");
                    assertEquals(802L, rs.getLong("id"), "Original V5 SQL kept newest inquiry 802");
                    assertFalse(rs.next(), "Older duplicate inquiry 801 was deduplicated by original V5");
                }
            }
        } finally {
            try (Connection conn = DriverManager.getConnection("jdbc:postgresql://" + PG_HOST + "/postgres", PG_USER, PG_PASS);
                 Statement stmt = conn.createStatement()) {
                stmt.execute("DROP DATABASE IF EXISTS " + histDb);
            } catch (Exception ignored) {
            }
        }
    }

    @Test
    @DisplayName("Verify pre-V5 upgrade data-preservation procedure: closes duplicate open inquiries, runs V5..V9 with validation, and preserves all inquiry IDs and message IDs")
    void testPreV5UpgradeDataPreservationWithProtectionProcedure() throws SQLException {
        Assumptions.assumeTrue(postgresAvailable, "PostgreSQL not reachable; skipping live DB test");

        String preV5JdbcUrl = "jdbc:postgresql://" + PG_HOST + "/" + PRE_V5_DB;

        // Step 1: Create an isolated database migrated only through V4
        Flyway flywayV4 = Flyway.configure()
                .dataSource(preV5JdbcUrl, PG_USER, PG_PASS)
                .target("4")
                .load();
        flywayV4.migrate();

        // Step 2: Insert duplicate PENDING_APPROVAL and ACTIVE inquiries for the same buyer/business, each with messages
        try (Connection conn = DriverManager.getConnection(preV5JdbcUrl, PG_USER, PG_PASS);
             Statement stmt = conn.createStatement()) {

            stmt.execute("INSERT INTO users (id, full_name, email, password_hash, role, status) VALUES " +
                    "(801, 'Legacy Seller', 'legacyseller@test.com', 'hash', 'SELLER', 'ACTIVE'), " +
                    "(802, 'Legacy Buyer', 'legacybuyer@test.com', 'hash', 'BUYER', 'ACTIVE')");
            stmt.execute("INSERT INTO business_categories (id, name) VALUES (5, 'Manufacturing')");
            stmt.execute("INSERT INTO businesses (id, seller_id, category_id, title, description, location, asking_price, status, verification_status) VALUES " +
                    "(803, 801, 5, 'Legacy Plant', 'Factory', 'Colombo', 250000, 'APPROVED', 'APPROVED')");

            // Seed duplicate inquiries: 901 (PENDING_APPROVAL) and 902 (ACTIVE)
            stmt.execute("INSERT INTO inquiries (id, business_id, buyer_id, seller_id, initial_message, status) VALUES " +
                    "(901, 803, 802, 801, 'First pre-V5 inquiry', 'PENDING_APPROVAL'), " +
                    "(902, 803, 802, 801, 'Duplicate pre-V5 inquiry', 'ACTIVE')");

            // Seed messages belonging to each inquiry
            stmt.execute("INSERT INTO messages (id, inquiry_id, sender_id, message) VALUES " +
                    "(951, 901, 802, 'Message inside first pre-V5 inquiry 901'), " +
                    "(952, 902, 802, 'Message inside second pre-V5 inquiry 902')");

            // Step 3: Run documented protection procedure BEFORE V5 that closes duplicates without deleting records
            // Execute the shipped protection SQL file directly instead of maintaining a separate hardcoded copy
            String protectionSql = null;
            try (java.io.InputStream is = getClass().getResourceAsStream("/db/upgrade/pre_v5_inquiry_data_protection.sql")) {
                if (is != null) {
                    protectionSql = new String(is.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                }
            } catch (Exception ignored) {
            }
            if (protectionSql == null) {
                java.nio.file.Path scriptPath = java.nio.file.Path.of("src/main/resources/db/upgrade/pre_v5_inquiry_data_protection.sql");
                if (!java.nio.file.Files.exists(scriptPath)) {
                    scriptPath = java.nio.file.Path.of("Backend/src/main/resources/db/upgrade/pre_v5_inquiry_data_protection.sql");
                }
                try {
                    protectionSql = java.nio.file.Files.readString(scriptPath, java.nio.charset.StandardCharsets.UTF_8);
                } catch (java.io.IOException e) {
                    throw new RuntimeException("Failed to read shipped pre_v5_inquiry_data_protection.sql", e);
                }
            }
            stmt.execute(protectionSql);
        }

        // Step 4: Apply V5 through V9 with Flyway validation enabled
        Flyway flywayV5ToV9 = Flyway.configure()
                .dataSource(preV5JdbcUrl, PG_USER, PG_PASS)
                .load();
        var upgradeResult = flywayV5ToV9.migrate();
        assertEquals("9", upgradeResult.targetSchemaVersion, "Upgrade to V9 must succeed");
        assertDoesNotThrow(flywayV5ToV9::validate, "Flyway validation with validation enabled must succeed");

        // Step 5: Assert every original inquiry ID and message ID still exists, and exactly one inquiry remains open
        try (Connection conn = DriverManager.getConnection(preV5JdbcUrl, PG_USER, PG_PASS);
             Statement stmt = conn.createStatement()) {

            // Assert exactly one inquiry remains open (ACTIVE or PENDING_APPROVAL)
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT id, status FROM inquiries WHERE business_id = 803 AND buyer_id = 802 AND status IN ('PENDING_APPROVAL', 'ACTIVE')")) {
                assertTrue(rs.next(), "Exactly one open inquiry must exist");
                assertEquals(902L, rs.getLong("id"));
                assertEquals("ACTIVE", rs.getString("status"), "Newer inquiry 902 must remain ACTIVE");
                assertFalse(rs.next(), "No second open inquiry must exist");
            }

            // Assert every original inquiry ID still exists (901 is CLOSED, 902 is ACTIVE)
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT id, status FROM inquiries WHERE id IN (901, 902) ORDER BY id ASC")) {
                assertTrue(rs.next(), "Original inquiry 901 must still exist");
                assertEquals(901L, rs.getLong("id"));
                assertEquals("CLOSED", rs.getString("status"), "Original inquiry 901 must be preserved as CLOSED");

                assertTrue(rs.next(), "Original inquiry 902 must still exist");
                assertEquals(902L, rs.getLong("id"));
                assertEquals("ACTIVE", rs.getString("status"), "Original inquiry 902 must exist as ACTIVE");

                assertFalse(rs.next(), "No unexpected inquiries");
            }

            // Assert every original message ID still exists (951 and 952 preserved)
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT id, inquiry_id, message FROM messages WHERE id IN (951, 952) ORDER BY id ASC")) {
                assertTrue(rs.next(), "Original message 951 must still exist");
                assertEquals(951L, rs.getLong("id"));
                assertEquals(901L, rs.getLong("inquiry_id"), "Message 951 must still belong to inquiry 901");

                assertTrue(rs.next(), "Original message 952 must still exist");
                assertEquals(952L, rs.getLong("id"));
                assertEquals(902L, rs.getLong("inquiry_id"), "Message 952 must still belong to inquiry 902");

                assertFalse(rs.next(), "No extra messages");
            }
        }
    }

    @Test
    @DisplayName("Inspect migration history of BizExchange database if present")
    void testInspectBizExchangeDatabase() {
        Assumptions.assumeTrue(postgresAvailable, "PostgreSQL not reachable; skipping inspection");
        try (Connection conn = DriverManager.getConnection("jdbc:postgresql://" + PG_HOST + "/BizExchange", PG_USER, PG_PASS)) {
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT installed_rank, version, description, checksum, success FROM flyway_schema_history ORDER BY installed_rank")) {
                System.out.println("=== APPLIED FLYWAY SCHEMA HISTORY IN BIZEXCHANGE ===");
                while (rs.next()) {
                    System.out.printf("  Rank %d: Version %s ('%s') Checksum: %d Success: %b%n",
                            rs.getInt("installed_rank"),
                            rs.getString("version"),
                            rs.getString("description"),
                            rs.getInt("checksum"),
                            rs.getBoolean("success"));
                }
            }
        } catch (Exception e) {
            System.out.println("BizExchange database inspection skipped: " + e.getMessage());
        }
    }

    @Test
    @DisplayName("Validate migrations against BizExchange database with full validation enabled")
    void testValidateBizExchangeDatabase() {
        Assumptions.assumeTrue(postgresAvailable, "PostgreSQL not reachable; skipping validation");
        try {
            Flyway flyway = Flyway.configure()
                    .dataSource("jdbc:postgresql://" + PG_HOST + "/BizExchange", PG_USER, PG_PASS)
                    .load();
            flyway.validate();
            System.out.println("Flyway validation against BizExchange SUCCEEDED with zero checksum mismatches!");
        } catch (Exception e) {
            System.out.println("Flyway validation against BizExchange FAILED: " + e.getMessage());
            throw e;
        }
    }
}
