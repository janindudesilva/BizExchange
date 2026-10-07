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
    private static final String PG_PASS = System.getenv("DB_PASSWORD") != null
            ? System.getenv("DB_PASSWORD")
            : System.getenv().getOrDefault("PGPASSWORD", "");
    private static final String FRESH_DB = "bizexchange_fresh_mig_test";
    private static final String UPGRADE_DB = "bizexchange_upgrade_mig_test";

    private static boolean postgresAvailable = false;

    @BeforeAll
    static void checkPostgreSqlAvailability() {
        try (Connection conn = DriverManager.getConnection("jdbc:postgresql://" + PG_HOST + "/postgres", PG_USER, PG_PASS)) {
            postgresAvailable = true;
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("DROP DATABASE IF EXISTS " + FRESH_DB);
                stmt.execute("DROP DATABASE IF EXISTS " + UPGRADE_DB);
                stmt.execute("CREATE DATABASE " + FRESH_DB);
                stmt.execute("CREATE DATABASE " + UPGRADE_DB);
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
                stmt.execute("DROP DATABASE IF EXISTS " + UPGRADE_DB);
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
        assertEquals("6", result.targetSchemaVersion, "Fresh DB should migrate up to version 6");

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

            // 4. Test concurrency / partial unique index enforcement
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
    @DisplayName("Verify safe upgrade from previous schema (V1..V4) to V5 with deduplication")
    void testSafeUpgradeFromV4ToV5() throws SQLException {
        Assumptions.assumeTrue(postgresAvailable, "PostgreSQL not reachable; skipping live DB test");

        String upgradeJdbcUrl = "jdbc:postgresql://" + PG_HOST + "/" + UPGRADE_DB;

        // Step 1: Migrate up to target V4
        Flyway flywayV4 = Flyway.configure()
                .dataSource(upgradeJdbcUrl, PG_USER, PG_PASS)
                .target("4")
                .load();
        flywayV4.migrate();

        // Step 2: Seed older data before V5, including duplicate open inquiries
        try (Connection conn = DriverManager.getConnection(upgradeJdbcUrl, PG_USER, PG_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.execute("INSERT INTO users (id, full_name, email, password_hash, role, status) VALUES " +
                    "(501, 'Seller Old', 'sellerold@test.com', 'hash', 'SELLER', 'ACTIVE'), " +
                    "(502, 'Buyer Old', 'buyerold@test.com', 'hash', 'BUYER', 'ACTIVE')");
            stmt.execute("INSERT INTO business_categories (id, name) VALUES (2, 'Retail')");
            stmt.execute("INSERT INTO businesses (id, seller_id, category_id, title, description, location, asking_price, status, verification_status) VALUES " +
                    "(601, 501, 2, 'Old Bakery', 'Historic bakery', 'Kandy', 75000, 'APPROVED', 'APPROVED')");

            // Insert duplicate inquiries (allowed before V5 index existed)
            stmt.execute("INSERT INTO inquiries (id, business_id, buyer_id, seller_id, initial_message, status) VALUES " +
                    "(701, 601, 502, 501, 'First old inquiry', 'PENDING_APPROVAL'), " +
                    "(702, 601, 502, 501, 'Duplicate old inquiry', 'ACTIVE')");
        }

        // Step 3: Run upgrade migration to V5
        Flyway flywayV5 = Flyway.configure()
                .dataSource(upgradeJdbcUrl, PG_USER, PG_PASS)
                .load();
        var upgradeResult = flywayV5.migrate();
        assertEquals("6", upgradeResult.targetSchemaVersion, "Upgrade should reach version 6");

        // Step 4: Verify deduplication deleted older duplicate and preserved newer one
        try (Connection conn = DriverManager.getConnection(upgradeJdbcUrl, PG_USER, PG_PASS);
             Statement stmt = conn.createStatement()) {
            try (ResultSet rs = stmt.executeQuery("SELECT id, status FROM inquiries WHERE business_id = 601 AND buyer_id = 502")) {
                assertTrue(rs.next(), "Should have retained an inquiry");
                assertEquals(702L, rs.getLong("id"), "V5 deduplication should preserve newest open inquiry (702)");
                assertFalse(rs.next(), "Duplicate inquiry (701) must have been deduplicated");
            }

            // Verify token_version exists and defaults to 1
            try (ResultSet rs = stmt.executeQuery("SELECT token_version FROM users WHERE id = 501")) {
                assertTrue(rs.next());
                assertEquals(1, rs.getInt("token_version"), "Existing users should have token_version default of 1");
            }
        }
    }
}
