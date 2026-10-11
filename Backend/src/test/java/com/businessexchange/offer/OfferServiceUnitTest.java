package com.businessexchange.offer;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessStatus;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.common.audit.service.AuditService;
import com.businessexchange.common.exception.DuplicateResourceException;
import com.businessexchange.deal.entity.Deal;
import com.businessexchange.deal.entity.DealStatus;
import com.businessexchange.deal.repository.DealRepository;
import com.businessexchange.inquiry.repository.InquiryRepository;
import com.businessexchange.notification.service.NotificationService;
import com.businessexchange.offer.dto.OfferCreateRequest;
import com.businessexchange.offer.dto.OfferResponse;
import com.businessexchange.offer.dto.RejectOfferRequest;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OfferServiceUnitTest {

    @Mock
    private OfferRepository offerRepository;

    @Mock
    private DealRepository dealRepository;

    @Mock
    private BusinessRepository businessRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SellerProfileRepository sellerProfileRepository;

    @Mock
    private InquiryRepository inquiryRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuditService auditService;

    @Mock
    private jakarta.persistence.EntityManager entityManager;

    @InjectMocks
    private OfferService offerService;

    private User buyer;
    private User seller;
    private Business approvedBusiness;
    private SellerProfile sellerProfile;

    @BeforeEach
    void setUp() {
        buyer = User.builder()
                .id(1L)
                .email("buyer@example.com")
                .fullName("Alice Buyer")
                .role(UserRole.BUYER)
                .status(AccountStatus.ACTIVE)
                .build();

        seller = User.builder()
                .id(2L)
                .email("seller@example.com")
                .fullName("Bob Seller")
                .role(UserRole.SELLER)
                .status(AccountStatus.ACTIVE)
                .build();

        approvedBusiness = Business.builder()
                .id(10L)
                .title("Tech Solutions Co.")
                .seller(seller)
                .status(BusinessStatus.APPROVED)
                .verificationStatus(VerificationStatus.APPROVED)
                .askingPrice(new BigDecimal("1000000.00"))
                .build();

        sellerProfile = SellerProfile.builder()
                .id(100L)
                .user(seller)
                .verificationStatus(VerificationStatus.APPROVED)
                .flaggedSuspicious(false)
                .build();
    }

    @Test
    @DisplayName("Buyer cannot make an offer on their own business")
    void testCannotOfferOnOwnBusiness() {
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        approvedBusiness.setSeller(buyer);
        when(businessRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(approvedBusiness));

        OfferCreateRequest req = OfferCreateRequest.builder()
                .businessId(10L)
                .amount(new BigDecimal("900000.00"))
                .currency("LKR")
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> offerService.createOffer("buyer@example.com", req));
        assertTrue(ex.getMessage().contains("own business"));
    }

    @Test
    @DisplayName("Cannot create offer on unapproved business")
    void testCannotOfferOnUnapprovedBusiness() {
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        approvedBusiness.setStatus(BusinessStatus.PENDING_REVIEW);
        when(businessRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(approvedBusiness));

        OfferCreateRequest req = OfferCreateRequest.builder()
                .businessId(10L)
                .amount(new BigDecimal("900000.00"))
                .currency("LKR")
                .build();

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> offerService.createOffer("buyer@example.com", req));
        assertTrue(ex.getMessage().contains("not eligible"));
    }

    @Test
    @DisplayName("Cannot create offer on sold business")
    void testCannotOfferOnSoldBusiness() {
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        approvedBusiness.setStatus(BusinessStatus.SOLD);
        when(businessRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(approvedBusiness));

        OfferCreateRequest req = OfferCreateRequest.builder()
                .businessId(10L)
                .amount(new BigDecimal("900000.00"))
                .currency("LKR")
                .build();

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> offerService.createOffer("buyer@example.com", req));
        assertTrue(ex.getMessage().contains("already marked as sold"));
    }

    @Test
    @DisplayName("Cannot create duplicate pending offer for same buyer and business")
    void testPreventDuplicatePendingOffer() {
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        when(businessRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(approvedBusiness));
        when(sellerProfileRepository.findByUserId(2L)).thenReturn(Optional.of(sellerProfile));
        when(dealRepository.existsByBusinessIdAndStatus(10L, DealStatus.IN_PROGRESS)).thenReturn(false);
        when(offerRepository.existsByBusinessIdAndBuyerIdAndStatus(10L, 1L, OfferStatus.PENDING)).thenReturn(true);

        OfferCreateRequest req = OfferCreateRequest.builder()
                .businessId(10L)
                .amount(new BigDecimal("900000.00"))
                .currency("LKR")
                .build();

        assertThrows(DuplicateResourceException.class,
                () -> offerService.createOffer("buyer@example.com", req));
    }

    @Test
    @DisplayName("Block offer when business currently has an active deal in progress")
    void testBlockOfferWhenActiveDealExists() {
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        when(businessRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(approvedBusiness));
        when(sellerProfileRepository.findByUserId(2L)).thenReturn(Optional.of(sellerProfile));
        when(dealRepository.existsByBusinessIdAndStatus(10L, DealStatus.IN_PROGRESS)).thenReturn(true);

        OfferCreateRequest req = OfferCreateRequest.builder()
                .businessId(10L)
                .amount(new BigDecimal("900000.00"))
                .currency("LKR")
                .build();

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> offerService.createOffer("buyer@example.com", req));
        assertTrue(ex.getMessage().contains("active deal in progress"));
    }

    @Test
    @DisplayName("Rejects non-LKR currencies when creating offer")
    void testOfferCreationRejectsNonLkrCurrency() {
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        when(businessRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(approvedBusiness));
        when(sellerProfileRepository.findByUserId(2L)).thenReturn(Optional.of(sellerProfile));
        when(dealRepository.existsByBusinessIdAndStatus(10L, DealStatus.IN_PROGRESS)).thenReturn(false);
        when(offerRepository.existsByBusinessIdAndBuyerIdAndStatus(10L, 1L, OfferStatus.PENDING)).thenReturn(false);

        OfferCreateRequest req = OfferCreateRequest.builder()
                .businessId(10L)
                .amount(new BigDecimal("950000.00"))
                .currency("USD")
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> offerService.createOffer("buyer@example.com", req));
        assertTrue(ex.getMessage().contains("Offer currency must match the listing currency (LKR)"));
    }

    @Test
    @DisplayName("Successful offer creation triggers audit log and seller notification")
    void testSuccessfulOfferCreation() {
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        when(businessRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(approvedBusiness));
        when(sellerProfileRepository.findByUserId(2L)).thenReturn(Optional.of(sellerProfile));
        when(dealRepository.existsByBusinessIdAndStatus(10L, DealStatus.IN_PROGRESS)).thenReturn(false);
        when(offerRepository.existsByBusinessIdAndBuyerIdAndStatus(10L, 1L, OfferStatus.PENDING)).thenReturn(false);

        Offer savedOffer = Offer.builder()
                .id(50L)
                .business(approvedBusiness)
                .buyer(buyer)
                .seller(seller)
                .amount(new BigDecimal("950000.00"))
                .currency("LKR")
                .status(OfferStatus.PENDING)
                .build();
        when(offerRepository.save(any(Offer.class))).thenReturn(savedOffer);

        OfferCreateRequest req = OfferCreateRequest.builder()
                .businessId(10L)
                .amount(new BigDecimal("950000.00"))
                .currency("LKR")
                .message("Initial cash offer")
                .build();

        OfferResponse resp = offerService.createOffer("buyer@example.com", req);
        assertNotNull(resp);
        assertEquals(50L, resp.getId());
        assertEquals("PENDING", resp.getStatus());
        assertEquals(new BigDecimal("950000.00"), resp.getAmount());

        verify(auditService, times(1)).record(eq(buyer), eq("OFFER_SUBMITTED"), eq("OFFER"), eq(50L), anyString());
        verify(notificationService, times(1)).notify(eq(seller), eq("New Offer Received"), anyString(), eq("/seller/offers"));
    }

    @Test
    @DisplayName("Buyer withdraws pending offer successfully")
    void testWithdrawOffer() {
        Offer offer = Offer.builder()
                .id(50L)
                .business(approvedBusiness)
                .buyer(buyer)
                .seller(seller)
                .amount(new BigDecimal("950000.00"))
                .currency("LKR")
                .status(OfferStatus.PENDING)
                .build();

        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        when(offerRepository.findById(50L)).thenReturn(Optional.of(offer));
        when(offerRepository.save(any(Offer.class))).thenAnswer(inv -> inv.getArgument(0));

        OfferResponse resp = offerService.withdrawOffer(50L, "buyer@example.com");
        assertEquals("WITHDRAWN", resp.getStatus());

        verify(auditService).record(eq(buyer), eq("OFFER_WITHDRAWN"), eq("OFFER"), eq(50L), anyString());
        verify(notificationService).notify(eq(seller), eq("Offer Withdrawn"), anyString(), eq("/seller/offers"));
    }

    @Test
    @DisplayName("Non-buyer cannot withdraw offer")
    void testNonBuyerCannotWithdrawOffer() {
        Offer offer = Offer.builder()
                .id(50L)
                .business(approvedBusiness)
                .buyer(buyer)
                .seller(seller)
                .status(OfferStatus.PENDING)
                .build();

        User impostor = User.builder().id(999L).email("impostor@example.com").build();
        when(userRepository.findByEmail("impostor@example.com")).thenReturn(Optional.of(impostor));
        when(offerRepository.findById(50L)).thenReturn(Optional.of(offer));

        assertThrows(AccessDeniedException.class, () -> offerService.withdrawOffer(50L, "impostor@example.com"));
    }

    @Test
    @DisplayName("Seller accepts offer: creates exactly one Deal and auto-rejects other pending offers")
    void testSellerAcceptsOffer() {
        Offer acceptedOffer = Offer.builder()
                .id(50L)
                .business(approvedBusiness)
                .buyer(buyer)
                .seller(seller)
                .amount(new BigDecimal("950000.00"))
                .currency("LKR")
                .status(OfferStatus.PENDING)
                .build();

        User anotherBuyer = User.builder().id(3L).fullName("Charlie").email("charlie@example.com").build();
        Offer otherPendingOffer = Offer.builder()
                .id(51L)
                .business(approvedBusiness)
                .buyer(anotherBuyer)
                .seller(seller)
                .amount(new BigDecimal("900000.00"))
                .currency("LKR")
                .status(OfferStatus.PENDING)
                .build();

        when(userRepository.findByEmail("seller@example.com")).thenReturn(Optional.of(seller));
        when(offerRepository.findById(50L)).thenReturn(Optional.of(acceptedOffer));
        when(businessRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(approvedBusiness));
        when(sellerProfileRepository.findByUserId(2L)).thenReturn(Optional.of(sellerProfile));
        when(dealRepository.existsByBusinessIdAndStatus(10L, DealStatus.IN_PROGRESS)).thenReturn(false);

        Deal createdDeal = Deal.builder()
                .id(700L)
                .business(approvedBusiness)
                .buyer(buyer)
                .seller(seller)
                .offer(acceptedOffer)
                .agreedPrice(new BigDecimal("950000.00"))
                .currency("LKR")
                .status(DealStatus.IN_PROGRESS)
                .build();
        when(dealRepository.save(any(Deal.class))).thenReturn(createdDeal);
        when(offerRepository.findByBusinessIdAndStatusAndIdNot(10L, OfferStatus.PENDING, 50L))
                .thenReturn(List.of(otherPendingOffer));

        OfferResponse resp = offerService.acceptOffer(50L, "seller@example.com");

        assertEquals("ACCEPTED", resp.getStatus());
        assertEquals(700L, resp.getDealId());
        assertEquals(OfferStatus.REJECTED, otherPendingOffer.getStatus());
        assertEquals("Another offer was accepted for this business", otherPendingOffer.getRejectionReason());

        verify(dealRepository, times(1)).save(any(Deal.class));
        verify(auditService).record(eq(seller), eq("OFFER_ACCEPTED"), eq("OFFER"), eq(50L), anyString());
        verify(auditService).record(eq(seller), eq("DEAL_CREATED"), eq("DEAL"), eq(700L), anyString());
        verify(notificationService).notify(eq(buyer), eq("Offer Accepted!"), anyString(), eq("/buyer/deals"));
        verify(notificationService).notify(eq(anotherBuyer), eq("Offer Status Update"), anyString(), eq("/buyer/offers"));
    }

    @Test
    @DisplayName("Idempotent repeated acceptance returns existing deal without duplicate deal creation or duplicate notifications")
    void testIdempotentRepeatedAcceptance() {
        Offer alreadyAccepted = Offer.builder()
                .id(50L)
                .business(approvedBusiness)
                .buyer(buyer)
                .seller(seller)
                .amount(new BigDecimal("950000.00"))
                .currency("LKR")
                .status(OfferStatus.ACCEPTED)
                .build();

        Deal existingDeal = Deal.builder()
                .id(700L)
                .business(approvedBusiness)
                .buyer(buyer)
                .seller(seller)
                .offer(alreadyAccepted)
                .agreedPrice(new BigDecimal("950000.00"))
                .currency("LKR")
                .status(DealStatus.IN_PROGRESS)
                .build();

        when(userRepository.findByEmail("seller@example.com")).thenReturn(Optional.of(seller));
        when(offerRepository.findById(50L)).thenReturn(Optional.of(alreadyAccepted));
        when(businessRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(approvedBusiness));
        when(dealRepository.findByOfferId(50L)).thenReturn(Optional.of(existingDeal));

        OfferResponse resp = offerService.acceptOffer(50L, "seller@example.com");

        assertEquals("ACCEPTED", resp.getStatus());
        assertEquals(700L, resp.getDealId());

        // Verify NO new deal is saved and NO new notification is emitted
        verify(dealRepository, never()).save(any(Deal.class));
        verify(notificationService, never()).notify(any(), any(), any(), any());
    }

    @Test
    @DisplayName("acceptOffer: Fails if business was rejected by admin while offer was pending")
    void testAcceptOfferFailsIfBusinessRejectedByAdmin() {
        approvedBusiness.setStatus(BusinessStatus.REJECTED);

        Offer pendingOffer = Offer.builder()
                .id(50L)
                .business(approvedBusiness)
                .buyer(buyer)
                .seller(seller)
                .amount(new BigDecimal("950000.00"))
                .currency("LKR")
                .status(OfferStatus.PENDING)
                .build();

        when(userRepository.findByEmail("seller@example.com")).thenReturn(Optional.of(seller));
        when(offerRepository.findById(50L)).thenReturn(Optional.of(pendingOffer));
        when(businessRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(approvedBusiness));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> offerService.acceptOffer(50L, "seller@example.com"));
        assertTrue(ex.getMessage().contains("not currently eligible for deal creation"));
        verify(dealRepository, never()).save(any());
    }
}
