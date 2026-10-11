package com.businessexchange.offer;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessCategory;
import com.businessexchange.business.entity.BusinessStatus;
import com.businessexchange.business.repository.BusinessCategoryRepository;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.common.exception.DuplicateResourceException;
import com.businessexchange.deal.dto.*;
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
import com.businessexchange.review.dto.ReviewCreateRequest;
import com.businessexchange.review.dto.ReviewResponse;
import com.businessexchange.review.repository.ReviewRepository;
import com.businessexchange.review.service.ReviewService;
import com.businessexchange.seller.entity.SellerProfile;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.seller.repository.SellerProfileRepository;
import com.businessexchange.user.entity.AccountStatus;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.DefaultTransactionDefinition;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class OfferAndDealWorkflowIntegrationTest {

    @Autowired
    private OfferService offerService;

    @Autowired
    private DealService dealService;

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private OfferRepository offerRepository;

    @Autowired
    private DealRepository dealRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private BusinessCategoryRepository categoryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SellerProfileRepository sellerProfileRepository;

    @Autowired
    private com.businessexchange.common.audit.repository.AuditLogRepository auditLogRepository;

    @Autowired
    private com.businessexchange.notification.repository.NotificationRepository notificationRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private User buyer1;
    private User buyer2;
    private User seller;
    private User admin;
    private Business business;
    private BusinessCategory category;

    @BeforeEach
    void setUp() {
        reviewRepository.deleteAll();
        dealRepository.deleteAll();
        offerRepository.deleteAll();
        notificationRepository.deleteAll();
        auditLogRepository.deleteAll();
        businessRepository.deleteAll();
        sellerProfileRepository.deleteAll();
        userRepository.deleteAll();
        categoryRepository.deleteAll();

        category = categoryRepository.save(BusinessCategory.builder()
                .name("Technology")
                .description("Tech businesses")
                .build());

        buyer1 = userRepository.save(User.builder()
                .email("buyer1@example.com")
                .passwordHash("$2a$10$abcdefghijklmnopqrstuvwxyz1234567890")
                .fullName("Buyer One")
                .role(UserRole.BUYER)
                .status(AccountStatus.ACTIVE)
                .tokenVersion(1)
                .build());

        buyer2 = userRepository.save(User.builder()
                .email("buyer2@example.com")
                .passwordHash("$2a$10$abcdefghijklmnopqrstuvwxyz1234567890")
                .fullName("Buyer Two")
                .role(UserRole.BUYER)
                .status(AccountStatus.ACTIVE)
                .tokenVersion(1)
                .build());

        seller = userRepository.save(User.builder()
                .email("seller@example.com")
                .passwordHash("$2a$10$abcdefghijklmnopqrstuvwxyz1234567890")
                .fullName("Seller Bob")
                .role(UserRole.SELLER)
                .status(AccountStatus.ACTIVE)
                .tokenVersion(1)
                .build());

        admin = userRepository.save(User.builder()
                .email("admin@bizexchange.local")
                .passwordHash("$2a$10$abcdefghijklmnopqrstuvwxyz1234567890")
                .fullName("Platform Administrator")
                .role(UserRole.ADMIN)
                .status(AccountStatus.ACTIVE)
                .tokenVersion(1)
                .build());

        sellerProfileRepository.save(SellerProfile.builder()
                .user(seller)
                .verificationStatus(VerificationStatus.APPROVED)
                .flaggedSuspicious(false)
                .address("Colombo, Sri Lanka")
                .build());

        business = businessRepository.save(Business.builder()
                .title("Apex Cloud Solutions")
                .description("Profitable B2B SaaS platform")
                .location("Colombo")
                .category(category)
                .seller(seller)
                .askingPrice(new BigDecimal("5000000.00"))
                .status(BusinessStatus.APPROVED)
                .verificationStatus(VerificationStatus.APPROVED)
                .build());
    }

    @Test
    @DisplayName("End-to-end Offer submission and validation")
    void testOfferSubmissionLifecycle() {
        OfferCreateRequest req = OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4800000.50"))
                .currency("LKR")
                .message("We can close quickly.")
                .build();

        OfferResponse resp = offerService.createOffer(buyer1.getEmail(), req);
        assertNotNull(resp.getId());
        assertEquals("PENDING", resp.getStatus());
        assertEquals(new BigDecimal("4800000.50"), resp.getAmount());
        assertEquals("LKR", resp.getCurrency());
        assertEquals(buyer1.getId(), resp.getBuyerId());
        assertEquals(seller.getId(), resp.getSellerId());

        // Attempting a second pending offer from buyer1 must be rejected
        assertThrows(DuplicateResourceException.class, () ->
                offerService.createOffer(buyer1.getEmail(), req));

        // Buyer2 can submit an offer for the same business
        OfferCreateRequest req2 = OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4900000.00"))
                .currency("LKR")
                .message("Buyer 2 cash offer")
                .build();

        OfferResponse resp2 = offerService.createOffer(buyer2.getEmail(), req2);
        assertNotNull(resp2.getId());
        assertEquals(2, offerRepository.count());
    }

    @Test
    @DisplayName("Accepting offer creates Deal and auto-rejects other pending offers")
    void testOfferAcceptanceCreatesDealAndRejectsOthers() {
        OfferResponse o1 = offerService.createOffer(buyer1.getEmail(), OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4800000.00"))
                .build());

        OfferResponse o2 = offerService.createOffer(buyer2.getEmail(), OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4900000.00"))
                .build());

        OfferResponse accepted = offerService.acceptOffer(o2.getId(), seller.getEmail());
        assertEquals("ACCEPTED", accepted.getStatus());
        assertNotNull(accepted.getDealId());

        Deal deal = dealRepository.findById(accepted.getDealId()).orElseThrow();
        assertEquals(DealStatus.IN_PROGRESS, deal.getStatus());
        assertEquals(new BigDecimal("4900000.00"), deal.getAgreedPrice());
        assertEquals(buyer2.getId(), deal.getBuyer().getId());
        assertEquals(seller.getId(), deal.getSeller().getId());
        assertEquals(business.getId(), deal.getBusiness().getId());

        Offer rejectedOffer = offerRepository.findById(o1.getId()).orElseThrow();
        assertEquals(OfferStatus.REJECTED, rejectedOffer.getStatus());
        assertEquals("Another offer was accepted for this business", rejectedOffer.getRejectionReason());

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                offerService.createOffer(buyer1.getEmail(), OfferCreateRequest.builder()
                        .businessId(business.getId())
                        .amount(new BigDecimal("5500000.00"))
                        .build()));
        assertTrue(ex.getMessage().contains("active deal in progress"));
    }

    @Test
    @DisplayName("Idempotency: Re-accepting already accepted offer produces no duplicate Deal or error")
    void testRepeatedAcceptanceIdempotency() {
        OfferResponse o1 = offerService.createOffer(buyer1.getEmail(), OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4800000.00"))
                .build());

        OfferResponse firstAccept = offerService.acceptOffer(o1.getId(), seller.getEmail());
        assertEquals(1, dealRepository.count());

        OfferResponse secondAccept = offerService.acceptOffer(o1.getId(), seller.getEmail());
        assertEquals(firstAccept.getDealId(), secondAccept.getDealId());
        assertEquals(1, dealRepository.count(), "Deal count must remain exactly 1");
    }

    @Test
    @DisplayName("Prevent concurrent acceptances from creating multiple active deals")
    void testConcurrentAcceptancePrevention() {
        OfferResponse o1 = offerService.createOffer(buyer1.getEmail(), OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4800000.00"))
                .build());

        OfferResponse o2 = offerService.createOffer(buyer2.getEmail(), OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4900000.00"))
                .build());

        offerService.acceptOffer(o1.getId(), seller.getEmail());

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                offerService.acceptOffer(o2.getId(), seller.getEmail()));
        assertTrue(ex.getMessage().contains("active deal in progress") || ex.getMessage().contains("Cannot accept offer"));

        assertEquals(1, dealRepository.count());
    }

    @Test
    @DisplayName("Transactional rollback: error during acceptance rolls back offer status and deal")
    void testTransactionalRollbackOnAcceptanceFailure() {
        OfferResponse o1 = offerService.createOffer(buyer1.getEmail(), OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4800000.00"))
                .build());

        DefaultTransactionDefinition def = new DefaultTransactionDefinition();
        def.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        TransactionStatus status = transactionManager.getTransaction(def);

        try {
            Business b = businessRepository.findById(business.getId()).orElseThrow();
            b.setStatus(BusinessStatus.SOLD);
            businessRepository.save(b);

            offerService.acceptOffer(o1.getId(), seller.getEmail());
            transactionManager.commit(status);
            fail("Expected exception was not thrown");
        } catch (IllegalStateException e) {
            transactionManager.rollback(status);
        }

        Offer afterRollback = offerRepository.findById(o1.getId()).orElseThrow();
        assertEquals(OfferStatus.PENDING, afterRollback.getStatus());
        assertEquals(0, dealRepository.count());
    }

    @Test
    @DisplayName("Separate buyer and seller completion confirmations required for COMPLETED status")
    void testMutualConfirmationRequiredForCompletion() {
        OfferResponse o1 = offerService.createOffer(buyer1.getEmail(), OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4800000.00"))
                .build());

        OfferResponse accepted = offerService.acceptOffer(o1.getId(), seller.getEmail());
        Long dealId = accepted.getDealId();

        // 1. Buyer confirms
        DealResponse afterBuyer = dealService.confirmCompletion(dealId, buyer1.getEmail());
        assertEquals("IN_PROGRESS", afterBuyer.getStatus(), "Deal must remain IN_PROGRESS with only one confirmation");
        assertNotNull(afterBuyer.getBuyerConfirmedAt());
        assertNull(afterBuyer.getSellerConfirmedAt());
        assertNull(afterBuyer.getClosedAt());
        assertNotNull(afterBuyer.getCompletionNotice());

        // 2. Buyer confirming again is idempotent and safe
        DealResponse doubleBuyer = dealService.confirmCompletion(dealId, buyer1.getEmail());
        assertEquals("IN_PROGRESS", doubleBuyer.getStatus());

        // 3. Seller confirms -> transitions to COMPLETED and marks business SOLD
        DealResponse afterSeller = dealService.confirmCompletion(dealId, seller.getEmail());
        assertEquals("COMPLETED", afterSeller.getStatus());
        assertNotNull(afterSeller.getSellerConfirmedAt());
        assertNotNull(afterSeller.getClosedAt());

        Business b = businessRepository.findById(business.getId()).orElseThrow();
        assertEquals(BusinessStatus.SOLD, b.getStatus());

        // 4. Completed deal cannot be modified further
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                dealService.confirmCompletion(dealId, buyer1.getEmail()));
        assertTrue(ex.getMessage().contains("already COMPLETED"));
    }

    @Test
    @DisplayName("Cancellation request workflow: requires counterparty agreement, blocks completion while pending")
    void testCancellationRequestAndAgreement() {
        OfferResponse o1 = offerService.createOffer(buyer1.getEmail(), OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4800000.00"))
                .build());

        OfferResponse accepted = offerService.acceptOffer(o1.getId(), seller.getEmail());
        Long dealId = accepted.getDealId();

        // 1. Buyer requests cancellation
        RequestCancellationRequest req = RequestCancellationRequest.builder()
                .reason("Due diligence revealed tax liabilities.")
                .build();
        DealResponse cancelRequested = dealService.requestCancellation(dealId, buyer1.getEmail(), req);
        assertTrue(cancelRequested.isCancellationPending());
        assertEquals("Due diligence revealed tax liabilities.", cancelRequested.getCancellationReason());
        assertEquals(buyer1.getId(), cancelRequested.getCancellationRequestedBy());

        // 2. Confirming completion while cancellation request is pending must be blocked
        IllegalStateException exConfirm = assertThrows(IllegalStateException.class, () ->
                dealService.confirmCompletion(dealId, seller.getEmail()));
        assertTrue(exConfirm.getMessage().contains("cancellation request is pending"));

        // 3. Buyer cannot respond to their own cancellation request
        assertThrows(IllegalStateException.class, () ->
                dealService.respondCancellation(dealId, buyer1.getEmail(), RespondCancellationRequest.builder().agree(true).build()));

        // 4. Seller agrees to cancellation -> deal transitions to CANCELLED
        DealResponse cancelled = dealService.respondCancellation(dealId, seller.getEmail(),
                RespondCancellationRequest.builder().agree(true).build());
        assertEquals("CANCELLED", cancelled.getStatus());
        assertNotNull(cancelled.getClosedAt());

        // Business remains NOT sold (released for new offers if trading permitted)
        Business b = businessRepository.findById(business.getId()).orElseThrow();
        assertNotEquals(BusinessStatus.SOLD, b.getStatus());
        assertEquals(BusinessStatus.APPROVED, b.getStatus());

        // New offer is now permitted on the business
        OfferResponse newOffer = offerService.createOffer(buyer2.getEmail(), OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4700000.00"))
                .build());
        assertNotNull(newOffer.getId());
    }

    @Test
    @DisplayName("Declining cancellation request clears pending state and retains IN_PROGRESS")
    void testDecliningCancellationRetainsInProgress() {
        OfferResponse o1 = offerService.createOffer(buyer1.getEmail(), OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4800000.00"))
                .build());

        OfferResponse accepted = offerService.acceptOffer(o1.getId(), seller.getEmail());
        Long dealId = accepted.getDealId();

        // Seller requests cancellation
        dealService.requestCancellation(dealId, seller.getEmail(), RequestCancellationRequest.builder()
                .reason("Personal emergency.")
                .build());

        // Buyer declines cancellation
        DealResponse declined = dealService.respondCancellation(dealId, buyer1.getEmail(),
                RespondCancellationRequest.builder().agree(false).build());

        assertEquals("IN_PROGRESS", declined.getStatus());
        assertFalse(declined.isCancellationPending());
        assertNull(declined.getCancellationReason());

        // Deal can now proceed with mutual confirmation
        dealService.confirmCompletion(dealId, buyer1.getEmail());
        DealResponse finalDeal = dealService.confirmCompletion(dealId, seller.getEmail());
        assertEquals("COMPLETED", finalDeal.getStatus());
    }

    @Test
    @DisplayName("Admin direct cancellation with required reason")
    void testAdminDirectCancellation() {
        OfferResponse o1 = offerService.createOffer(buyer1.getEmail(), OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4800000.00"))
                .build());

        OfferResponse accepted = offerService.acceptOffer(o1.getId(), seller.getEmail());
        Long dealId = accepted.getDealId();

        // Non-admin cannot call adminCancelDeal
        assertThrows(AccessDeniedException.class, () ->
                dealService.adminCancelDeal(dealId, buyer1.getEmail(), AdminCancelDealRequest.builder().reason("Fraud").build()));

        // Admin cancels deal
        DealResponse adminCancelled = dealService.adminCancelDeal(dealId, admin.getEmail(),
                AdminCancelDealRequest.builder().reason("Compliance audit failure").build());

        assertEquals("CANCELLED", adminCancelled.getStatus());
        assertNotNull(adminCancelled.getClosedAt());
        assertTrue(adminCancelled.getCancellationReason().contains("Compliance audit failure"));
    }

    @Test
    @DisplayName("Reviews require COMPLETED deal; closed inquiry no longer qualifies; one review per buyer/seller enforced")
    void testReviewsRequireCompletedDeal() {
        // 1. Without a completed deal, review attempt is rejected
        ReviewCreateRequest reviewReq = ReviewCreateRequest.builder()
                .rating(5)
                .comment("Great transaction!")
                .build();

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                reviewService.createReview(buyer1.getEmail(), seller.getId(), reviewReq));
        assertTrue(ex.getMessage().contains("completed deal"));

        // 2. Create offer, accept, and complete deal mutually
        OfferResponse o1 = offerService.createOffer(buyer1.getEmail(), OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4800000.00"))
                .build());
        OfferResponse accepted = offerService.acceptOffer(o1.getId(), seller.getEmail());
        Long dealId = accepted.getDealId();

        dealService.confirmCompletion(dealId, buyer1.getEmail());
        dealService.confirmCompletion(dealId, seller.getEmail());

        // 3. Now buyer1 has a COMPLETED deal with seller -> review succeeds
        ReviewResponse createdReview = reviewService.createReview(buyer1.getEmail(), seller.getId(), reviewReq);
        assertNotNull(createdReview.getId());
        assertEquals(seller.getId(), createdReview.getSellerId());
        assertEquals(buyer1.getId(), createdReview.getBuyerId());
        assertEquals(dealId, createdReview.getDealId());

        // 4. Duplicate review from same buyer for same seller is rejected
        assertThrows(DuplicateResourceException.class, () ->
                reviewService.createReview(buyer1.getEmail(), seller.getId(), reviewReq));
    }

    @Test
    @DisplayName("Cross-user access control: buyers and sellers can view only their own deals; admin views all")
    void testCrossUserAccessControl() {
        OfferResponse o1 = offerService.createOffer(buyer1.getEmail(), OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4800000.00"))
                .build());
        OfferResponse accepted = offerService.acceptOffer(o1.getId(), seller.getEmail());
        Long dealId = accepted.getDealId();

        // Buyer 1 can view
        DealResponse d1 = dealService.getDealById(dealId, buyer1.getEmail());
        assertEquals(dealId, d1.getId());

        // Seller can view
        DealResponse d2 = dealService.getDealById(dealId, seller.getEmail());
        assertEquals(dealId, d2.getId());

        // Admin can view
        DealResponse dAdmin = dealService.getDealById(dealId, admin.getEmail());
        assertEquals(dealId, dAdmin.getId());

        // Buyer 2 cannot view
        assertThrows(AccessDeniedException.class, () ->
                dealService.getDealById(dealId, buyer2.getEmail()));

        // Lists:
        assertEquals(1, dealService.getMyDeals(buyer1.getEmail()).size());
        assertEquals(0, dealService.getMyDeals(buyer2.getEmail()).size());
        assertEquals(1, dealService.getMyDeals(seller.getEmail()).size());
        assertEquals(1, dealService.getAllDealsAdmin().size());
    }

    @Test
    @DisplayName("Cancellation conflicts: concurrent requests and completing cancelled deals blocked")
    void testCancellationConflictsAndInvalidTransitions() {
        OfferResponse o1 = offerService.createOffer(buyer1.getEmail(), OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4800000.00"))
                .build());
        OfferResponse accepted = offerService.acceptOffer(o1.getId(), seller.getEmail());
        Long dealId = accepted.getDealId();

        // 1. Buyer requests cancellation
        dealService.requestCancellation(dealId, buyer1.getEmail(),
                RequestCancellationRequest.builder().reason("Buyer change of mind").build());

        // 2. Conflicting second cancellation request by seller is blocked
        IllegalStateException exConflict = assertThrows(IllegalStateException.class, () ->
                dealService.requestCancellation(dealId, seller.getEmail(),
                        RequestCancellationRequest.builder().reason("Seller also wants to cancel").build()));
        assertTrue(exConflict.getMessage().contains("already pending"));

        // 3. Counterparty agrees to cancel
        dealService.respondCancellation(dealId, seller.getEmail(),
                RespondCancellationRequest.builder().agree(true).build());

        // 4. Attempting to confirm on a CANCELLED deal is blocked
        IllegalStateException exConfirmCancelled = assertThrows(IllegalStateException.class, () ->
                dealService.confirmCompletion(dealId, buyer1.getEmail()));
        assertTrue(exConfirmCancelled.getMessage().contains("already CANCELLED"));

        // 5. Admin cannot cancel a deal that is already CANCELLED
        IllegalStateException exAdminCancel = assertThrows(IllegalStateException.class, () ->
                dealService.adminCancelDeal(dealId, admin.getEmail(),
                        AdminCancelDealRequest.builder().reason("Duplicate cancel").build()));
        assertTrue(exAdminCancel.getMessage().contains("already CANCELLED"));
    }

    @Test
    @DisplayName("Review eligibility strictly requires COMPLETED deal (IN_PROGRESS and CANCELLED deals do not qualify)")
    void testReviewEligibilityLifecycle() {
        ReviewCreateRequest reviewReq = ReviewCreateRequest.builder()
                .rating(4)
                .comment("Checking eligibility")
                .build();

        OfferResponse o1 = offerService.createOffer(buyer1.getEmail(), OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4800000.00"))
                .build());
        OfferResponse accepted = offerService.acceptOffer(o1.getId(), seller.getEmail());
        Long dealId = accepted.getDealId();

        // 1. Deal is IN_PROGRESS: review must be rejected
        AccessDeniedException exInProgress = assertThrows(AccessDeniedException.class, () ->
                reviewService.createReview(buyer1.getEmail(), seller.getId(), reviewReq));
        assertTrue(exInProgress.getMessage().contains("completed deal"));

        // 2. Cancel the deal: review must still be rejected
        dealService.requestCancellation(dealId, buyer1.getEmail(),
                RequestCancellationRequest.builder().reason("Cannot continue").build());
        dealService.respondCancellation(dealId, seller.getEmail(),
                RespondCancellationRequest.builder().agree(true).build());

        AccessDeniedException exCancelled = assertThrows(AccessDeniedException.class, () ->
                reviewService.createReview(buyer1.getEmail(), seller.getId(), reviewReq));
        assertTrue(exCancelled.getMessage().contains("completed deal"));

        // 3. Create a second offer and complete it
        OfferResponse o2 = offerService.createOffer(buyer1.getEmail(), OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4850000.00"))
                .build());
        OfferResponse accepted2 = offerService.acceptOffer(o2.getId(), seller.getEmail());
        Long completedDealId = accepted2.getDealId();

        dealService.confirmCompletion(completedDealId, buyer1.getEmail());
        dealService.confirmCompletion(completedDealId, seller.getEmail());

        // 4. Now buyer1 can submit review
        ReviewResponse review = reviewService.createReview(buyer1.getEmail(), seller.getId(), reviewReq);
        assertNotNull(review.getId());
        assertEquals(completedDealId, review.getDealId());

        // 5. Buyer2 cannot review seller because buyer2 has no completed deal
        AccessDeniedException exBuyer2 = assertThrows(AccessDeniedException.class, () ->
                reviewService.createReview(buyer2.getEmail(), seller.getId(), reviewReq));
        assertTrue(exBuyer2.getMessage().contains("completed deal"));
    }

    @Test
    @DisplayName("Cross-user confirmation security: unauthorized user cannot confirm another party's deal")
    void testCrossUserConfirmationSecurity() {
        OfferResponse o1 = offerService.createOffer(buyer1.getEmail(), OfferCreateRequest.builder()
                .businessId(business.getId())
                .amount(new BigDecimal("4800000.00"))
                .build());
        OfferResponse accepted = offerService.acceptOffer(o1.getId(), seller.getEmail());
        Long dealId = accepted.getDealId();

        // Buyer2 (stranger to this deal) attempts to confirm
        assertThrows(AccessDeniedException.class, () ->
                dealService.confirmCompletion(dealId, buyer2.getEmail()));

        // Buyer2 attempts to request cancellation
        assertThrows(AccessDeniedException.class, () ->
                dealService.requestCancellation(dealId, buyer2.getEmail(),
                        RequestCancellationRequest.builder().reason("Interference").build()));
    }
}

