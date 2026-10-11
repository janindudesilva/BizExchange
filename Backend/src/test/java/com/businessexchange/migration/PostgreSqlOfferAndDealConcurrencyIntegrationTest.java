package com.businessexchange.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;

import java.math.BigDecimal;
import java.sql.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

public class PostgreSqlOfferAndDealConcurrencyIntegrationTest {

    private static final String PG_HOST = System.getenv().getOrDefault("DB_HOST", "localhost:5432");
    private static final String PG_USER = System.getenv().getOrDefault("DB_USER", "postgres");
    private static final String PG_PASS = resolvePassword();
    private static final String CONCURRENCY_DB = "bizexchange_concurrency_test";

    private static String resolvePassword() {
        String pass = System.getProperty("DB_PASSWORD");
        if (pass != null && !pass.isEmpty()) return pass;
        pass = System.getenv("DB_PASSWORD");
        if (pass != null && !pass.isEmpty()) return pass;
        pass = System.getenv("PGPASSWORD");
        if (pass != null && !pass.isEmpty()) return pass;

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
    private static String concurrencyJdbcUrl;

    @BeforeAll
    static void checkPostgreSqlAvailability() {
        String envActive = System.getenv("SPRING_PROFILES_ACTIVE");
        String isProdEnv = System.getenv("PRODUCTION");
        if ("true".equalsIgnoreCase(isProdEnv) || "prod".equalsIgnoreCase(envActive) || "production".equalsIgnoreCase(envActive)) {
            System.out.println("Concurrency integration tests disabled in production.");
            postgresAvailable = false;
            return;
        }

        String host = PG_HOST.toLowerCase();
        String hostWithoutPort = host.contains(":") ? host.substring(0, host.indexOf(":")) : host;
        if (!hostWithoutPort.equals("localhost") && !hostWithoutPort.equals("127.0.0.1") && !hostWithoutPort.equals("postgres")) {
            postgresAvailable = false;
            return;
        }

        try (Connection conn = DriverManager.getConnection("jdbc:postgresql://" + PG_HOST + "/postgres", PG_USER, PG_PASS)) {
            postgresAvailable = true;
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("DROP DATABASE IF EXISTS " + CONCURRENCY_DB);
                stmt.execute("CREATE DATABASE " + CONCURRENCY_DB);
            }

            concurrencyJdbcUrl = "jdbc:postgresql://" + PG_HOST + "/" + CONCURRENCY_DB;
            Flyway.configure()
                    .dataSource(concurrencyJdbcUrl, PG_USER, PG_PASS)
                    .cleanDisabled(false)
                    .load()
                    .migrate();

        } catch (Exception e) {
            System.out.println("Local PostgreSQL not available for concurrency test: " + e.getMessage());
            postgresAvailable = false;
        }
    }

    @AfterAll
    static void tearDown() {
        if (postgresAvailable) {
            try (Connection conn = DriverManager.getConnection("jdbc:postgresql://" + PG_HOST + "/postgres", PG_USER, PG_PASS);
                 Statement stmt = conn.createStatement()) {
                stmt.execute("DROP DATABASE IF EXISTS " + CONCURRENCY_DB);
            } catch (Exception ignored) {
            }
        }
    }

    @BeforeEach
    void resetData() throws SQLException {
        Assumptions.assumeTrue(postgresAvailable, "PostgreSQL not reachable; skipping concurrency test");

        try (Connection conn = DriverManager.getConnection(concurrencyJdbcUrl, PG_USER, PG_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.execute("TRUNCATE TABLE reviews, deals, offers, inquiries, businesses, business_categories, users CASCADE;");

            // Seed base accounts and category
            stmt.execute("INSERT INTO users (id, full_name, email, password_hash, role, status) VALUES " +
                    "(1, 'Seller User', 'seller@concurrency.local', 'hash', 'SELLER', 'ACTIVE'), " +
                    "(2, 'Buyer One', 'buyer1@concurrency.local', 'hash', 'BUYER', 'ACTIVE'), " +
                    "(3, 'Buyer Two', 'buyer2@concurrency.local', 'hash', 'BUYER', 'ACTIVE'), " +
                    "(4, 'Admin User', 'admin@concurrency.local', 'hash', 'ADMIN', 'ACTIVE');");
            stmt.execute("INSERT INTO business_categories (id, name) VALUES (1, 'Retail');");
        }
    }

    @Test
    @DisplayName("CONCURRENCY 1: Two offers for same business accepted simultaneously results in exactly one active deal and auto-rejection of competing offer")
    void testTwoOffersAcceptedSimultaneously() throws Exception {
        long businessId = 100L;
        long offer1Id = 1001L;
        long offer2Id = 1002L;

        try (Connection conn = DriverManager.getConnection(concurrencyJdbcUrl, PG_USER, PG_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.execute("INSERT INTO businesses (id, seller_id, category_id, title, description, location, asking_price, status, verification_status) VALUES " +
                    "(" + businessId + ", 1, 1, 'Boutique Store', 'Profitable store', 'Colombo', 1000000, 'APPROVED', 'APPROVED');");

            stmt.execute("INSERT INTO offers (id, business_id, buyer_id, seller_id, amount, currency, status, created_at) VALUES " +
                    "(" + offer1Id + ", " + businessId + ", 2, 1, 950000, 'LKR', 'PENDING', NOW()), " +
                    "(" + offer2Id + ", " + businessId + ", 3, 1, 980000, 'LKR', 'PENDING', NOW());");
        }

        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        Callable<Boolean> acceptOffer1 = () -> executeAcceptOfferWorkflow(offer1Id, businessId, 2L, 1L, new BigDecimal("950000"), startLatch);
        Callable<Boolean> acceptOffer2 = () -> executeAcceptOfferWorkflow(offer2Id, businessId, 3L, 1L, new BigDecimal("980000"), startLatch);

        Future<Boolean> f1 = executor.submit(acceptOffer1);
        Future<Boolean> f2 = executor.submit(acceptOffer2);

        startLatch.countDown(); // Release both threads simultaneously

        boolean res1 = f1.get(10, TimeUnit.SECONDS);
        boolean res2 = f2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        // Exactly one acceptance must succeed; the other must fail/abort cleanly
        assertTrue(res1 ^ res2, "Exactly one offer acceptance must succeed (res1=" + res1 + ", res2=" + res2 + ")");

        // Verify database state
        try (Connection conn = DriverManager.getConnection(concurrencyJdbcUrl, PG_USER, PG_PASS);
             Statement stmt = conn.createStatement()) {

            // Assert exactly one deal exists and is IN_PROGRESS
            ResultSet rsDeals = stmt.executeQuery("SELECT count(*), status FROM deals WHERE business_id = " + businessId + " GROUP BY status;");
            assertTrue(rsDeals.next());
            assertEquals(1, rsDeals.getInt(1), "Exactly one active deal must exist for this business");
            assertEquals("IN_PROGRESS", rsDeals.getString(2));
            assertFalse(rsDeals.next());

            // Assert one offer is ACCEPTED and the other is REJECTED
            ResultSet rsAccepted = stmt.executeQuery("SELECT id FROM offers WHERE business_id = " + businessId + " AND status = 'ACCEPTED';");
            assertTrue(rsAccepted.next());
            long acceptedId = rsAccepted.getLong(1);

            ResultSet rsRejected = stmt.executeQuery("SELECT id, rejection_reason FROM offers WHERE business_id = " + businessId + " AND status = 'REJECTED';");
            assertTrue(rsRejected.next());
            long rejectedId = rsRejected.getLong(1);
            assertEquals("Another offer was accepted for this business", rsRejected.getString(2));

            assertNotEquals(acceptedId, rejectedId);
        }
    }

    @Test
    @DisplayName("CONCURRENCY 2: Same offer accepted twice simultaneously creates exactly one deal without duplicate deal or error")
    void testSameOfferAcceptedTwiceSimultaneously() throws Exception {
        long businessId = 200L;
        long offerId = 2001L;

        try (Connection conn = DriverManager.getConnection(concurrencyJdbcUrl, PG_USER, PG_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.execute("INSERT INTO businesses (id, seller_id, category_id, title, description, location, asking_price, status, verification_status) VALUES " +
                    "(" + businessId + ", 1, 1, 'Bakery Cafe', 'Busy cafe', 'Kandy', 800000, 'APPROVED', 'APPROVED');");

            stmt.execute("INSERT INTO offers (id, business_id, buyer_id, seller_id, amount, currency, status, created_at) VALUES " +
                    "(" + offerId + ", " + businessId + ", 2, 1, 750000, 'LKR', 'PENDING', NOW());");
        }

        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        Callable<Boolean> attempt1 = () -> executeAcceptOfferWorkflowWithIdempotency(offerId, businessId, 2L, 1L, new BigDecimal("750000"), startLatch);
        Callable<Boolean> attempt2 = () -> executeAcceptOfferWorkflowWithIdempotency(offerId, businessId, 2L, 1L, new BigDecimal("750000"), startLatch);

        Future<Boolean> f1 = executor.submit(attempt1);
        Future<Boolean> f2 = executor.submit(attempt2);

        startLatch.countDown();

        boolean res1 = f1.get(10, TimeUnit.SECONDS);
        boolean res2 = f2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        // Both calls should complete successfully (one created, second returned idempotently)
        assertTrue(res1 && res2, "Both calls must succeed without exception (one creates, one idempotent)");

        try (Connection conn = DriverManager.getConnection(concurrencyJdbcUrl, PG_USER, PG_PASS);
             Statement stmt = conn.createStatement()) {
            ResultSet rsDeals = stmt.executeQuery("SELECT count(*) FROM deals WHERE offer_id = " + offerId + ";");
            assertTrue(rsDeals.next());
            assertEquals(1, rsDeals.getInt(1), "Exactly one deal must exist for this offer");
        }
    }

    @Test
    @DisplayName("CONCURRENCY 3: Buyer and seller confirming completion simultaneously completes deal and marks business sold without lost confirmations")
    void testBuyerAndSellerConfirmCompletionSimultaneously() throws Exception {
        long businessId = 300L;
        long offerId = 3001L;
        long dealId = 30001L;

        try (Connection conn = DriverManager.getConnection(concurrencyJdbcUrl, PG_USER, PG_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.execute("INSERT INTO businesses (id, seller_id, category_id, title, description, location, asking_price, status, verification_status) VALUES " +
                    "(" + businessId + ", 1, 1, 'Auto Workshop', 'Full service', 'Galle', 1500000, 'APPROVED', 'APPROVED');");

            stmt.execute("INSERT INTO offers (id, business_id, buyer_id, seller_id, amount, currency, status, created_at) VALUES " +
                    "(" + offerId + ", " + businessId + ", 2, 1, 1500000, 'LKR', 'ACCEPTED', NOW());");

            stmt.execute("INSERT INTO deals (id, business_id, buyer_id, seller_id, offer_id, agreed_price, currency, status, created_at) VALUES " +
                    "(" + dealId + ", " + businessId + ", 2, 1, " + offerId + ", 1500000, 'LKR', 'IN_PROGRESS', NOW());");
        }

        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        Callable<Boolean> buyerConfirm = () -> executeConfirmCompletion(dealId, businessId, true, startLatch);
        Callable<Boolean> sellerConfirm = () -> executeConfirmCompletion(dealId, businessId, false, startLatch);

        Future<Boolean> f1 = executor.submit(buyerConfirm);
        Future<Boolean> f2 = executor.submit(sellerConfirm);

        startLatch.countDown();

        boolean b1 = f1.get(10, TimeUnit.SECONDS);
        boolean b2 = f2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(b1 && b2, "Both confirmations must succeed");

        try (Connection conn = DriverManager.getConnection(concurrencyJdbcUrl, PG_USER, PG_PASS);
             Statement stmt = conn.createStatement()) {
            ResultSet rsDeal = stmt.executeQuery("SELECT status, buyer_confirmed_at, seller_confirmed_at FROM deals WHERE id = " + dealId + ";");
            assertTrue(rsDeal.next());
            assertEquals("COMPLETED", rsDeal.getString("status"));
            assertNotNull(rsDeal.getTimestamp("buyer_confirmed_at"), "Buyer confirmation must not be lost");
            assertNotNull(rsDeal.getTimestamp("seller_confirmed_at"), "Seller confirmation must not be lost");

            ResultSet rsBiz = stmt.executeQuery("SELECT status FROM businesses WHERE id = " + businessId + ";");
            assertTrue(rsBiz.next());
            assertEquals("SOLD", rsBiz.getString("status"), "Business must be marked as SOLD upon mutual completion");
        }
    }

    @Test
    @DisplayName("CONCURRENCY 4: Completion racing with cancellation results in a consistent final state")
    void testCompletionRacingWithCancellation() throws Exception {
        long businessId = 400L;
        long offerId = 4001L;
        long dealId = 40001L;

        try (Connection conn = DriverManager.getConnection(concurrencyJdbcUrl, PG_USER, PG_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.execute("INSERT INTO businesses (id, seller_id, category_id, title, description, location, asking_price, status, verification_status) VALUES " +
                    "(" + businessId + ", 1, 1, 'Gym Center', 'Equipment included', 'Negombo', 2000000, 'APPROVED', 'APPROVED');");

            stmt.execute("INSERT INTO offers (id, business_id, buyer_id, seller_id, amount, currency, status, created_at) VALUES " +
                    "(" + offerId + ", " + businessId + ", 2, 1, 2000000, 'LKR', 'ACCEPTED', NOW());");

            stmt.execute("INSERT INTO deals (id, business_id, buyer_id, seller_id, offer_id, agreed_price, currency, status, buyer_confirmed_at, created_at) VALUES " +
                    "(" + dealId + ", " + businessId + ", 2, 1, " + offerId + ", 2000000, 'LKR', 'IN_PROGRESS', NOW(), NOW());");
        }

        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        // Thread 1: Seller confirms final completion (which would transition to COMPLETED)
        Callable<String> sellerCompletes = () -> {
            startLatch.await();
            try (Connection conn = DriverManager.getConnection(concurrencyJdbcUrl, PG_USER, PG_PASS)) {
                conn.setAutoCommit(false);
                try (PreparedStatement psLock = conn.prepareStatement("SELECT status FROM deals WHERE id = ? FOR UPDATE;")) {
                    psLock.setLong(1, dealId);
                    try (ResultSet rs = psLock.executeQuery()) {
                        if (!rs.next() || !"IN_PROGRESS".equals(rs.getString("status"))) {
                            conn.rollback();
                            return "ABORTED_NOT_IN_PROGRESS";
                        }
                    }
                }
                // Transition to COMPLETED
                try (PreparedStatement psUpdate = conn.prepareStatement(
                        "UPDATE deals SET status = 'COMPLETED', seller_confirmed_at = NOW(), closed_at = NOW() WHERE id = ?;")) {
                    psUpdate.setLong(1, dealId);
                    psUpdate.executeUpdate();
                }
                try (PreparedStatement psBiz = conn.prepareStatement("UPDATE businesses SET status = 'SOLD' WHERE id = ?;")) {
                    psBiz.setLong(1, businessId);
                    psBiz.executeUpdate();
                }
                conn.commit();
                return "COMPLETED";
            } catch (Exception e) {
                return "ERROR:" + e.getMessage();
            }
        };

        // Thread 2: Admin cancels deal simultaneously
        Callable<String> adminCancels = () -> {
            startLatch.await();
            try (Connection conn = DriverManager.getConnection(concurrencyJdbcUrl, PG_USER, PG_PASS)) {
                conn.setAutoCommit(false);
                try (PreparedStatement psLock = conn.prepareStatement("SELECT status FROM deals WHERE id = ? FOR UPDATE;")) {
                    psLock.setLong(1, dealId);
                    try (ResultSet rs = psLock.executeQuery()) {
                        if (!rs.next() || !"IN_PROGRESS".equals(rs.getString("status"))) {
                            conn.rollback();
                            return "ABORTED_NOT_IN_PROGRESS";
                        }
                    }
                }
                // Transition to CANCELLED
                try (PreparedStatement psUpdate = conn.prepareStatement(
                        "UPDATE deals SET status = 'CANCELLED', closed_at = NOW(), cancellation_reason = 'Admin intervention' WHERE id = ?;")) {
                    psUpdate.setLong(1, dealId);
                    psUpdate.executeUpdate();
                }
                conn.commit();
                return "CANCELLED";
            } catch (Exception e) {
                return "ERROR:" + e.getMessage();
            }
        };

        Future<String> f1 = executor.submit(sellerCompletes);
        Future<String> f2 = executor.submit(adminCancels);

        startLatch.countDown();

        String res1 = f1.get(10, TimeUnit.SECONDS);
        String res2 = f2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        // Exactly one should succeed; the other gets ABORTED_NOT_IN_PROGRESS
        boolean completedWon = "COMPLETED".equals(res1) && "ABORTED_NOT_IN_PROGRESS".equals(res2);
        boolean cancelledWon = "CANCELLED".equals(res2) && "ABORTED_NOT_IN_PROGRESS".equals(res1);

        assertTrue(completedWon || cancelledWon, "Either completion or cancellation must win cleanly without conflict. Res1=" + res1 + ", Res2=" + res2);

        try (Connection conn = DriverManager.getConnection(concurrencyJdbcUrl, PG_USER, PG_PASS);
             Statement stmt = conn.createStatement()) {
            ResultSet rs = stmt.executeQuery("SELECT status FROM deals WHERE id = " + dealId + ";");
            assertTrue(rs.next());
            String finalStatus = rs.getString(1);
            assertTrue("COMPLETED".equals(finalStatus) || "CANCELLED".equals(finalStatus));
        }
    }

    @Test
    @DisplayName("CONCURRENCY 5: New offer submitted while another offer is accepted blocks duplicate active reservation")
    void testNewOfferSubmittedWhileAnotherOfferAccepted() throws Exception {
        long businessId = 500L;
        long offer1Id = 5001L;
        long offer2Id = 5002L;

        try (Connection conn = DriverManager.getConnection(concurrencyJdbcUrl, PG_USER, PG_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.execute("INSERT INTO businesses (id, seller_id, category_id, title, description, location, asking_price, status, verification_status) VALUES " +
                    "(" + businessId + ", 1, 1, 'Logistics Hub', 'Warehouse included', 'Wattala', 5000000, 'APPROVED', 'APPROVED');");

            stmt.execute("INSERT INTO offers (id, business_id, buyer_id, seller_id, amount, currency, status, created_at) VALUES " +
                    "(" + offer1Id + ", " + businessId + ", 2, 1, 4800000, 'LKR', 'PENDING', NOW());");
        }

        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        // Thread 1: Accept Offer 1
        Callable<Boolean> acceptOffer1 = () -> executeAcceptOfferWorkflow(offer1Id, businessId, 2L, 1L, new BigDecimal("4800000"), startLatch);

        // Thread 2: Submit Offer 2 concurrently
        Callable<String> submitOffer2 = () -> {
            startLatch.await();
            try (Connection conn = DriverManager.getConnection(concurrencyJdbcUrl, PG_USER, PG_PASS)) {
                conn.setAutoCommit(false);
                // Serialized via pessimistic lock on business
                try (PreparedStatement psLock = conn.prepareStatement("SELECT status FROM businesses WHERE id = ? FOR UPDATE;")) {
                    psLock.setLong(1, businessId);
                    try (ResultSet rs = psLock.executeQuery()) {
                        if (!rs.next() || "SOLD".equals(rs.getString("status"))) {
                            conn.rollback();
                            return "REJECTED_SOLD";
                        }
                    }
                }
                // Check if active deal exists
                try (PreparedStatement psCheckDeal = conn.prepareStatement("SELECT count(*) FROM deals WHERE business_id = ? AND status = 'IN_PROGRESS';")) {
                    psCheckDeal.setLong(1, businessId);
                    try (ResultSet rs = psCheckDeal.executeQuery()) {
                        rs.next();
                        if (rs.getInt(1) > 0) {
                            conn.rollback();
                            return "REJECTED_ACTIVE_DEAL";
                        }
                    }
                }

                // If no active deal, insert pending offer
                try (PreparedStatement psInsert = conn.prepareStatement(
                        "INSERT INTO offers (id, business_id, buyer_id, seller_id, amount, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW());")) {
                    psInsert.setLong(1, offer2Id);
                    psInsert.setLong(2, businessId);
                    psInsert.setLong(3, 3L);
                    psInsert.setLong(4, 1L);
                    psInsert.setBigDecimal(5, new BigDecimal("4900000"));
                    psInsert.setString(6, "LKR");
                    psInsert.setString(7, "PENDING");
                    psInsert.executeUpdate();
                }
                conn.commit();
                return "SUBMITTED";
            } catch (Exception e) {
                return "ERROR:" + e.getMessage();
            }
        };

        Future<Boolean> f1 = executor.submit(acceptOffer1);
        Future<String> f2 = executor.submit(submitOffer2);

        startLatch.countDown();

        boolean acceptSuccess = f1.get(10, TimeUnit.SECONDS);
        String submitResult = f2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(acceptSuccess, "Accepting offer 1 must succeed");
        // Submit offer 2 either was rejected due to active deal or was created before acceptance and auto-rejected
        try (Connection conn = DriverManager.getConnection(concurrencyJdbcUrl, PG_USER, PG_PASS);
             Statement stmt = conn.createStatement()) {
            // Verify exactly one active deal exists
            ResultSet rsDeals = stmt.executeQuery("SELECT count(*) FROM deals WHERE business_id = " + businessId + " AND status = 'IN_PROGRESS';");
            assertTrue(rsDeals.next());
            assertEquals(1, rsDeals.getInt(1));

            // Verify Offer 2 is never PENDING while deal is IN_PROGRESS
            ResultSet rsOffer2 = stmt.executeQuery("SELECT status FROM offers WHERE id = " + offer2Id + ";");
            if (rsOffer2.next()) {
                assertEquals("REJECTED", rsOffer2.getString("status"), "If offer was submitted, it must have been auto-rejected");
            } else {
                assertEquals("REJECTED_ACTIVE_DEAL", submitResult, "If offer was not created, submission was rejected due to active deal");
            }
        }
    }

    // --- Helper methods executing real transactional workflows with row locks ---

    private boolean executeAcceptOfferWorkflow(long offerId, long businessId, long buyerId, long sellerId, BigDecimal amount, CountDownLatch latch) {
        try {
            latch.await();
            try (Connection conn = DriverManager.getConnection(concurrencyJdbcUrl, PG_USER, PG_PASS)) {
                conn.setAutoCommit(false);

                // 1. Pessimistic write lock on Business row
                try (PreparedStatement psLock = conn.prepareStatement("SELECT status FROM businesses WHERE id = ? FOR UPDATE;")) {
                    psLock.setLong(1, businessId);
                    try (ResultSet rs = psLock.executeQuery()) {
                        if (!rs.next() || !"APPROVED".equals(rs.getString("status"))) {
                            conn.rollback();
                            return false;
                        }
                    }
                }

                // 2. Refresh offer status under business lock
                try (PreparedStatement psOffer = conn.prepareStatement("SELECT status FROM offers WHERE id = ?;")) {
                    psOffer.setLong(1, offerId);
                    try (ResultSet rs = psOffer.executeQuery()) {
                        if (!rs.next() || !"PENDING".equals(rs.getString("status"))) {
                            conn.rollback();
                            return false;
                        }
                    }
                }

                // 3. Check for existing active deal
                try (PreparedStatement psCheck = conn.prepareStatement("SELECT count(*) FROM deals WHERE business_id = ? AND status = 'IN_PROGRESS';")) {
                    psCheck.setLong(1, businessId);
                    try (ResultSet rs = psCheck.executeQuery()) {
                        rs.next();
                        if (rs.getInt(1) > 0) {
                            conn.rollback();
                            return false;
                        }
                    }
                }

                // 4. Mark offer as ACCEPTED
                try (PreparedStatement psAccept = conn.prepareStatement("UPDATE offers SET status = 'ACCEPTED' WHERE id = ?;")) {
                    psAccept.setLong(1, offerId);
                    psAccept.executeUpdate();
                }

                // 5. Create Deal
                long dealId = System.currentTimeMillis() + offerId;
                try (PreparedStatement psDeal = conn.prepareStatement(
                        "INSERT INTO deals (id, business_id, buyer_id, seller_id, offer_id, agreed_price, currency, status, created_at) " +
                                "VALUES (?, ?, ?, ?, ?, ?, ?, 'IN_PROGRESS', NOW());")) {
                    psDeal.setLong(1, dealId);
                    psDeal.setLong(2, businessId);
                    psDeal.setLong(3, buyerId);
                    psDeal.setLong(4, sellerId);
                    psDeal.setLong(5, offerId);
                    psDeal.setBigDecimal(6, amount);
                    psDeal.setString(7, "LKR");
                    psDeal.executeUpdate();
                }

                // 6. Auto-reject other pending offers for this business
                try (PreparedStatement psRejectOthers = conn.prepareStatement(
                        "UPDATE offers SET status = 'REJECTED', rejection_reason = 'Another offer was accepted for this business' " +
                                "WHERE business_id = ? AND status = 'PENDING' AND id != ?;")) {
                    psRejectOthers.setLong(1, businessId);
                    psRejectOthers.setLong(2, offerId);
                    psRejectOthers.executeUpdate();
                }

                conn.commit();
                return true;
            }
        } catch (Exception e) {
            System.err.println("Accept offer error: " + e.getMessage());
            return false;
        }
    }

    private boolean executeAcceptOfferWorkflowWithIdempotency(long offerId, long businessId, long buyerId, long sellerId, BigDecimal amount, CountDownLatch latch) {
        try {
            latch.await();
            try (Connection conn = DriverManager.getConnection(concurrencyJdbcUrl, PG_USER, PG_PASS)) {
                conn.setAutoCommit(false);

                // Lock business
                try (PreparedStatement psLock = conn.prepareStatement("SELECT status FROM businesses WHERE id = ? FOR UPDATE;")) {
                    psLock.setLong(1, businessId);
                    psLock.executeQuery();
                }

                // Refresh offer status
                try (PreparedStatement psOffer = conn.prepareStatement("SELECT status FROM offers WHERE id = ?;")) {
                    psOffer.setLong(1, offerId);
                    try (ResultSet rs = psOffer.executeQuery()) {
                        if (rs.next() && "ACCEPTED".equals(rs.getString("status"))) {
                            // Idempotent safe return: already accepted
                            conn.commit();
                            return true;
                        }
                    }
                }

                // Accept offer and insert deal
                try (PreparedStatement psAccept = conn.prepareStatement("UPDATE offers SET status = 'ACCEPTED' WHERE id = ?;")) {
                    psAccept.setLong(1, offerId);
                    psAccept.executeUpdate();
                }

                long dealId = System.currentTimeMillis() + offerId;
                try (PreparedStatement psDeal = conn.prepareStatement(
                        "INSERT INTO deals (id, business_id, buyer_id, seller_id, offer_id, agreed_price, currency, status, created_at) " +
                                "VALUES (?, ?, ?, ?, ?, ?, ?, 'IN_PROGRESS', NOW());")) {
                    psDeal.setLong(1, dealId);
                    psDeal.setLong(2, businessId);
                    psDeal.setLong(3, buyerId);
                    psDeal.setLong(4, sellerId);
                    psDeal.setLong(5, offerId);
                    psDeal.setBigDecimal(6, amount);
                    psDeal.setString(7, "LKR");
                    psDeal.executeUpdate();
                }

                conn.commit();
                return true;
            }
        } catch (Exception e) {
            System.err.println("Accept offer idempotency error: " + e.getMessage());
            return false;
        }
    }

    private boolean executeConfirmCompletion(long dealId, long businessId, boolean isBuyer, CountDownLatch latch) {
        try {
            latch.await();
            try (Connection conn = DriverManager.getConnection(concurrencyJdbcUrl, PG_USER, PG_PASS)) {
                conn.setAutoCommit(false);

                // Lock deal row
                Timestamp buyerConf = null;
                Timestamp sellerConf = null;
                String status = null;

                try (PreparedStatement psLock = conn.prepareStatement("SELECT status, buyer_confirmed_at, seller_confirmed_at FROM deals WHERE id = ? FOR UPDATE;")) {
                    psLock.setLong(1, dealId);
                    try (ResultSet rs = psLock.executeQuery()) {
                        if (!rs.next() || !"IN_PROGRESS".equals(rs.getString("status"))) {
                            conn.rollback();
                            return false;
                        }
                        status = rs.getString("status");
                        buyerConf = rs.getTimestamp("buyer_confirmed_at");
                        sellerConf = rs.getTimestamp("seller_confirmed_at");
                    }
                }

                Timestamp now = new Timestamp(System.currentTimeMillis());
                if (isBuyer) {
                    buyerConf = now;
                    try (PreparedStatement psUpdate = conn.prepareStatement("UPDATE deals SET buyer_confirmed_at = ? WHERE id = ?;")) {
                        psUpdate.setTimestamp(1, now);
                        psUpdate.setLong(2, dealId);
                        psUpdate.executeUpdate();
                    }
                } else {
                    sellerConf = now;
                    try (PreparedStatement psUpdate = conn.prepareStatement("UPDATE deals SET seller_confirmed_at = ? WHERE id = ?;")) {
                        psUpdate.setTimestamp(1, now);
                        psUpdate.setLong(2, dealId);
                        psUpdate.executeUpdate();
                    }
                }

                // If both confirmed, complete deal and mark business as SOLD
                if (buyerConf != null && sellerConf != null) {
                    try (PreparedStatement psComp = conn.prepareStatement("UPDATE deals SET status = 'COMPLETED', closed_at = NOW() WHERE id = ?;")) {
                        psComp.setLong(1, dealId);
                        psComp.executeUpdate();
                    }
                    try (PreparedStatement psBiz = conn.prepareStatement("UPDATE businesses SET status = 'SOLD' WHERE id = ?;")) {
                        psBiz.setLong(1, businessId);
                        psBiz.executeUpdate();
                    }
                }

                conn.commit();
                return true;
            }
        } catch (Exception e) {
            return false;
        }
    }
}
