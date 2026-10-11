package com.businessexchange.deal;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessCategory;
import com.businessexchange.business.entity.BusinessStatus;
import com.businessexchange.business.repository.BusinessCategoryRepository;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.deal.dto.AdminCancelDealRequest;
import com.businessexchange.deal.dto.DealResponse;
import com.businessexchange.deal.entity.Deal;
import com.businessexchange.deal.entity.DealStatus;
import com.businessexchange.deal.repository.DealRepository;
import com.businessexchange.deal.service.DealService;
import com.businessexchange.offer.dto.OfferCreateRequest;
import com.businessexchange.offer.dto.OfferResponse;
import com.businessexchange.offer.entity.Offer;
import com.businessexchange.offer.entity.OfferStatus;
import com.businessexchange.offer.repository.OfferRepository;
import com.businessexchange.offer.service.OfferService;
import com.businessexchange.seller.entity.SellerProfile;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.seller.repository.SellerProfileRepository;
import com.businessexchange.user.entity.AccountStatus;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class SpringPostgreSqlOfferAndDealServiceConcurrencyIntegrationTest {

    private static final String PG_HOST = System.getenv().getOrDefault("DB_HOST", "localhost:5432");
    private static final String PG_USER = System.getenv().getOrDefault("DB_USER", "postgres");
    private static final String PG_PASS = resolvePassword();
    private static final String DB_NAME = "bizexchange_spring_concurrency_test";

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

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        try (Connection conn = DriverManager.getConnection("jdbc:postgresql://" + PG_HOST + "/postgres", PG_USER, PG_PASS)) {
            postgresAvailable = true;
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("DROP DATABASE IF EXISTS " + DB_NAME);
                stmt.execute("CREATE DATABASE " + DB_NAME);
            }

            registry.add("spring.datasource.url", () -> "jdbc:postgresql://" + PG_HOST + "/" + DB_NAME);
            registry.add("spring.datasource.username", () -> PG_USER);
            registry.add("spring.datasource.password", () -> PG_PASS);
            registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
            registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
            registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
            registry.add("spring.flyway.enabled", () -> "true");

        } catch (Exception e) {
            postgresAvailable = false;
            // Fallback to H2 in-memory so test context doesn't crash if PG is missing
            registry.add("spring.datasource.url", () -> "jdbc:h2:mem:pgfallbackdb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL");
            registry.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
            registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.H2Dialect");
            registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
            registry.add("spring.flyway.enabled", () -> "false");
        }
    }

    @AfterAll
    static void tearDown() {
        if (postgresAvailable) {
            try (Connection conn = DriverManager.getConnection("jdbc:postgresql://" + PG_HOST + "/postgres", PG_USER, PG_PASS);
                 Statement stmt = conn.createStatement()) {
                stmt.execute("DROP DATABASE IF EXISTS " + DB_NAME);
            } catch (Exception ignored) {
            }
        }
    }

    @Autowired
    private OfferService offerService;

    @Autowired
    private DealService dealService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BusinessCategoryRepository categoryRepository;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private SellerProfileRepository sellerProfileRepository;

    @Autowired
    private OfferRepository offerRepository;

    @Autowired
    private DealRepository dealRepository;

    private User seller;
    private User buyer1;
    private User buyer2;
    private User admin;
    private BusinessCategory category;
    private Business business;

    @BeforeEach
    void setUp() {
        Assumptions.assumeTrue(postgresAvailable, "PostgreSQL not available on localhost:5432");

        dealRepository.deleteAll();
        offerRepository.deleteAll();
        businessRepository.deleteAll();
        sellerProfileRepository.deleteAll();
        categoryRepository.deleteAll();
        userRepository.deleteAll();

        seller = userRepository.save(User.builder()
                .email("seller.spring@concurrency.local")
                .passwordHash("$2a$10$dummyHashPlaceholderForTest12345678901234567890")
                .fullName("Seller Real")
                .role(UserRole.SELLER)
                .status(AccountStatus.ACTIVE)
                .build());

        sellerProfileRepository.save(SellerProfile.builder()
                .user(seller)
                .verificationStatus(VerificationStatus.APPROVED)
                .flaggedSuspicious(false)
                .build());

        buyer1 = userRepository.save(User.builder()
                .email("buyer1.spring@concurrency.local")
                .passwordHash("$2a$10$dummyHashPlaceholderForTest12345678901234567890")
                .fullName("Buyer One")
                .role(UserRole.BUYER)
                .status(AccountStatus.ACTIVE)
                .build());

        buyer2 = userRepository.save(User.builder()
                .email("buyer2.spring@concurrency.local")
                .passwordHash("$2a$10$dummyHashPlaceholderForTest12345678901234567890")
                .fullName("Buyer Two")
                .role(UserRole.BUYER)
                .status(AccountStatus.ACTIVE)
                .build());

        admin = userRepository.save(User.builder()
                .email("admin.spring@concurrency.local")
                .passwordHash("$2a$10$dummyHashPlaceholderForTest12345678901234567890")
                .fullName("Admin Real")
                .role(UserRole.ADMIN)
                .status(AccountStatus.ACTIVE)
                .build());

        category = categoryRepository.save(BusinessCategory.builder()
                .name("Retail " + System.currentTimeMillis())
                .description("Retail test")
                .build());

        business = businessRepository.save(Business.builder()
                .title("Supermarket Chain")
                .description("Operational supermarket")
                .location("Colombo")
                .askingPrice(new BigDecimal("10000000.00"))
                .seller(seller)
                .category(category)
                .status(BusinessStatus.APPROVED)
                .verificationStatus(VerificationStatus.APPROVED)
                .build());
    }

    @Test
    @DisplayName("REAL SERVICE CONCURRENCY 1: Two competing offers accepted concurrently through Spring OfferService")
    void testSpringConcurrentCompetingOfferAcceptances() throws Exception {
        Offer offer1 = offerRepository.save(Offer.builder()
                .business(business)
                .buyer(buyer1)
                .seller(seller)
                .amount(new BigDecimal("9500000.00"))
                .currency("LKR")
                .status(OfferStatus.PENDING)
                .build());

        Offer offer2 = offerRepository.save(Offer.builder()
                .business(business)
                .buyer(buyer2)
                .seller(seller)
                .amount(new BigDecimal("9800000.00"))
                .currency("LKR")
                .status(OfferStatus.PENDING)
                .build());

        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        Callable<OfferResponse> callAccept1 = () -> {
            startLatch.await();
            return offerService.acceptOffer(offer1.getId(), seller.getEmail());
        };

        Callable<OfferResponse> callAccept2 = () -> {
            startLatch.await();
            return offerService.acceptOffer(offer2.getId(), seller.getEmail());
        };

        Future<OfferResponse> f1 = executor.submit(callAccept1);
        Future<OfferResponse> f2 = executor.submit(callAccept2);

        startLatch.countDown();

        OfferResponse resp1 = null;
        OfferResponse resp2 = null;
        Exception exc1 = null;
        Exception exc2 = null;

        try {
            resp1 = f1.get(10, TimeUnit.SECONDS);
        } catch (ExecutionException ee) {
            exc1 = (Exception) ee.getCause();
        }

        try {
            resp2 = f2.get(10, TimeUnit.SECONDS);
        } catch (ExecutionException ee) {
            exc2 = (Exception) ee.getCause();
        }

        executor.shutdown();

        // Exactly one call must succeed; the losing call must throw a clean controlled exception (IllegalStateException)
        boolean oneSucceeded = (resp1 != null && exc2 instanceof IllegalStateException) ||
                               (resp2 != null && exc1 instanceof IllegalStateException);
        assertTrue(oneSucceeded, "Exactly one offer acceptance must succeed and the other must throw IllegalStateException");

        // Verify database state: exactly 1 active deal in PostgreSQL
        assertEquals(1, dealRepository.countByStatus(DealStatus.IN_PROGRESS));
        Offer o1 = offerRepository.findById(offer1.getId()).orElseThrow();
        Offer o2 = offerRepository.findById(offer2.getId()).orElseThrow();

        if (resp1 != null) {
            assertEquals(OfferStatus.ACCEPTED, o1.getStatus());
            assertEquals(OfferStatus.REJECTED, o2.getStatus());
            assertEquals("Another offer was accepted for this business", o2.getRejectionReason());
        } else {
            assertEquals(OfferStatus.ACCEPTED, o2.getStatus());
            assertEquals(OfferStatus.REJECTED, o1.getStatus());
            assertEquals("Another offer was accepted for this business", o1.getRejectionReason());
        }
    }

    @Test
    @DisplayName("REAL SERVICE CONCURRENCY 2: Repeated simultaneous acceptance of the same offer through Spring OfferService")
    void testSpringRepeatedAcceptanceOfSameOffer() throws Exception {
        Offer offer = offerRepository.save(Offer.builder()
                .business(business)
                .buyer(buyer1)
                .seller(seller)
                .amount(new BigDecimal("9500000.00"))
                .currency("LKR")
                .status(OfferStatus.PENDING)
                .build());

        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        Callable<OfferResponse> task1 = () -> {
            startLatch.await();
            return offerService.acceptOffer(offer.getId(), seller.getEmail());
        };

        Callable<OfferResponse> task2 = () -> {
            startLatch.await();
            return offerService.acceptOffer(offer.getId(), seller.getEmail());
        };

        Future<OfferResponse> f1 = executor.submit(task1);
        Future<OfferResponse> f2 = executor.submit(task2);

        startLatch.countDown();

        OfferResponse r1 = f1.get(10, TimeUnit.SECONDS);
        OfferResponse r2 = f2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertNotNull(r1);
        assertNotNull(r2);
        assertEquals("ACCEPTED", r1.getStatus());
        assertEquals("ACCEPTED", r2.getStatus());
        assertEquals(r1.getDealId(), r2.getDealId(), "Both calls must return the same deal ID idempotently");

        // Exactly one deal created in database
        assertEquals(1, dealRepository.countByStatus(DealStatus.IN_PROGRESS));
        assertEquals(1, dealRepository.count());
    }

    @Test
    @DisplayName("REAL SERVICE CONCURRENCY 3: Simultaneous buyer and seller completion confirmations through Spring DealService")
    void testSpringSimultaneousCompletionConfirmations() throws Exception {
        Offer offer = offerRepository.save(Offer.builder()
                .business(business)
                .buyer(buyer1)
                .seller(seller)
                .amount(new BigDecimal("9500000.00"))
                .currency("LKR")
                .status(OfferStatus.ACCEPTED)
                .build());

        Deal deal = dealRepository.save(Deal.builder()
                .business(business)
                .buyer(buyer1)
                .seller(seller)
                .offer(offer)
                .agreedPrice(new BigDecimal("9500000.00"))
                .currency("LKR")
                .status(DealStatus.IN_PROGRESS)
                .build());

        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        Callable<DealResponse> buyerConfirm = () -> {
            startLatch.await();
            return dealService.confirmCompletion(deal.getId(), buyer1.getEmail());
        };

        Callable<DealResponse> sellerConfirm = () -> {
            startLatch.await();
            return dealService.confirmCompletion(deal.getId(), seller.getEmail());
        };

        Future<DealResponse> f1 = executor.submit(buyerConfirm);
        Future<DealResponse> f2 = executor.submit(sellerConfirm);

        startLatch.countDown();

        DealResponse r1 = f1.get(10, TimeUnit.SECONDS);
        DealResponse r2 = f2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertNotNull(r1);
        assertNotNull(r2);

        // Verify final state in PostgreSQL: deal is COMPLETED, business is SOLD, both timestamps recorded
        Deal savedDeal = dealRepository.findById(deal.getId()).orElseThrow();
        assertEquals(DealStatus.COMPLETED, savedDeal.getStatus());
        assertNotNull(savedDeal.getBuyerConfirmedAt(), "Buyer confirmation timestamp must not be lost");
        assertNotNull(savedDeal.getSellerConfirmedAt(), "Seller confirmation timestamp must not be lost");
        assertNotNull(savedDeal.getClosedAt());

        Business savedBiz = businessRepository.findById(business.getId()).orElseThrow();
        assertEquals(BusinessStatus.SOLD, savedBiz.getStatus(), "Business must be marked as SOLD upon completion");
    }

    @Test
    @DisplayName("REAL SERVICE CONCURRENCY 4: Completion confirmation racing with admin cancellation through Spring DealService")
    void testSpringCompletionRacingWithCancellation() throws Exception {
        Offer offer = offerRepository.save(Offer.builder()
                .business(business)
                .buyer(buyer1)
                .seller(seller)
                .amount(new BigDecimal("9500000.00"))
                .currency("LKR")
                .status(OfferStatus.ACCEPTED)
                .build());

        // Buyer already confirmed earlier; seller confirmation is racing with admin cancellation
        Deal deal = dealRepository.save(Deal.builder()
                .business(business)
                .buyer(buyer1)
                .seller(seller)
                .offer(offer)
                .agreedPrice(new BigDecimal("9500000.00"))
                .currency("LKR")
                .status(DealStatus.IN_PROGRESS)
                .buyerConfirmedAt(java.time.LocalDateTime.now())
                .build());

        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        Callable<DealResponse> sellerConfirm = () -> {
            startLatch.await();
            return dealService.confirmCompletion(deal.getId(), seller.getEmail());
        };

        Callable<DealResponse> adminCancel = () -> {
            startLatch.await();
            return dealService.adminCancelDeal(deal.getId(), admin.getEmail(),
                    AdminCancelDealRequest.builder().reason("Platform policy violation").build());
        };

        Future<DealResponse> f1 = executor.submit(sellerConfirm);
        Future<DealResponse> f2 = executor.submit(adminCancel);

        startLatch.countDown();

        DealResponse r1 = null;
        DealResponse r2 = null;
        Exception e1 = null;
        Exception e2 = null;

        try {
            r1 = f1.get(10, TimeUnit.SECONDS);
        } catch (ExecutionException ee) {
            e1 = (Exception) ee.getCause();
        }

        try {
            r2 = f2.get(10, TimeUnit.SECONDS);
        } catch (ExecutionException ee) {
            e2 = (Exception) ee.getCause();
        }

        executor.shutdown();

        // Exactly one must win; the other must receive an IllegalStateException
        boolean completionWon = (r1 != null && "COMPLETED".equals(r1.getStatus()) && e2 instanceof IllegalStateException);
        boolean cancellationWon = (r2 != null && "CANCELLED".equals(r2.getStatus()) && e1 instanceof IllegalStateException);

        assertTrue(completionWon || cancellationWon, "Either completion or cancellation must win cleanly without conflict");

        Deal saved = dealRepository.findById(deal.getId()).orElseThrow();
        assertTrue(saved.getStatus() == DealStatus.COMPLETED || saved.getStatus() == DealStatus.CANCELLED);
    }

    @Test
    @DisplayName("REAL SERVICE CONCURRENCY 5: Offer creation racing with offer acceptance through Spring OfferService")
    void testSpringOfferCreationRacingWithAcceptance() throws Exception {
        Offer offer1 = offerRepository.save(Offer.builder()
                .business(business)
                .buyer(buyer1)
                .seller(seller)
                .amount(new BigDecimal("9500000.00"))
                .currency("LKR")
                .status(OfferStatus.PENDING)
                .build());

        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        Callable<OfferResponse> acceptOffer1 = () -> {
            startLatch.await();
            return offerService.acceptOffer(offer1.getId(), seller.getEmail());
        };

        Callable<OfferResponse> createOffer2 = () -> {
            startLatch.await();
            return offerService.createOffer(buyer2.getEmail(), OfferCreateRequest.builder()
                    .businessId(business.getId())
                    .amount(new BigDecimal("9800000.00"))
                    .currency("LKR")
                    .build());
        };

        Future<OfferResponse> fAccept = executor.submit(acceptOffer1);
        Future<OfferResponse> fCreate = executor.submit(createOffer2);

        startLatch.countDown();

        OfferResponse respAccept = null;
        OfferResponse respCreate = null;
        Exception excCreate = null;

        respAccept = fAccept.get(10, TimeUnit.SECONDS);
        try {
            respCreate = fCreate.get(10, TimeUnit.SECONDS);
        } catch (ExecutionException ee) {
            excCreate = (Exception) ee.getCause();
        }

        executor.shutdown();

        assertNotNull(respAccept);
        assertEquals("ACCEPTED", respAccept.getStatus());

        // Verify consistent final state:
        // Either createOffer was rejected because active deal was in progress (IllegalStateException),
        // OR createOffer executed just before acceptOffer and was subsequently auto-rejected by acceptOffer!
        if (excCreate != null) {
            assertTrue(excCreate instanceof IllegalStateException, "Expected IllegalStateException but got: " + excCreate);
            assertTrue(excCreate.getMessage().contains("active deal in progress"));
        } else {
            assertNotNull(respCreate);
            Offer offer2 = offerRepository.findById(respCreate.getId()).orElseThrow();
            assertEquals(OfferStatus.REJECTED, offer2.getStatus(), "If created, competing offer must be auto-rejected");
        }

        // Assert exactly 1 active deal exists
        assertEquals(1, dealRepository.countByStatus(DealStatus.IN_PROGRESS));
    }
}
