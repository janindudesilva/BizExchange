package com.businessexchange.deal;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessStatus;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.common.audit.service.AuditService;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.deal.dto.*;
import com.businessexchange.deal.entity.Deal;
import com.businessexchange.deal.entity.DealStatus;
import com.businessexchange.deal.repository.DealRepository;
import com.businessexchange.deal.service.DealService;
import com.businessexchange.notification.service.NotificationService;
import com.businessexchange.offer.entity.Offer;
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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DealServiceUnitTest {

    @Mock
    private DealRepository dealRepository;

    @Mock
    private BusinessRepository businessRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private DealService dealService;

    private User buyer;
    private User seller;
    private User admin;
    private User stranger;
    private Business business;
    private Offer offer;
    private Deal deal;

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

        admin = User.builder()
                .id(3L)
                .email("admin@bizexchange.local")
                .fullName("Admin User")
                .role(UserRole.ADMIN)
                .status(AccountStatus.ACTIVE)
                .build();

        stranger = User.builder()
                .id(4L)
                .email("stranger@example.com")
                .fullName("Eve Stranger")
                .role(UserRole.BUYER)
                .status(AccountStatus.ACTIVE)
                .build();

        business = Business.builder()
                .id(10L)
                .title("Tech Solutions Co.")
                .seller(seller)
                .status(BusinessStatus.APPROVED)
                .build();

        offer = Offer.builder()
                .id(100L)
                .business(business)
                .buyer(buyer)
                .seller(seller)
                .amount(new BigDecimal("5000000.00"))
                .currency("LKR")
                .build();

        deal = Deal.builder()
                .id(200L)
                .business(business)
                .buyer(buyer)
                .seller(seller)
                .offer(offer)
                .agreedPrice(new BigDecimal("5000000.00"))
                .currency("LKR")
                .status(DealStatus.IN_PROGRESS)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("getDealById: Buyer can view their own deal")
    void testGetDealById_BuyerAuthorized() {
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(dealRepository.findById(deal.getId())).thenReturn(Optional.of(deal));

        DealResponse response = dealService.getDealById(deal.getId(), buyer.getEmail());
        assertNotNull(response);
        assertEquals(deal.getId(), response.getId());
        assertEquals("Tech Solutions Co.", response.getBusinessTitle());
    }

    @Test
    @DisplayName("getDealById: Seller can view their own deal")
    void testGetDealById_SellerAuthorized() {
        when(userRepository.findByEmail(seller.getEmail())).thenReturn(Optional.of(seller));
        when(dealRepository.findById(deal.getId())).thenReturn(Optional.of(deal));

        DealResponse response = dealService.getDealById(deal.getId(), seller.getEmail());
        assertNotNull(response);
        assertEquals(deal.getId(), response.getId());
    }

    @Test
    @DisplayName("getDealById: Admin can view any deal")
    void testGetDealById_AdminAuthorized() {
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(dealRepository.findById(deal.getId())).thenReturn(Optional.of(deal));

        DealResponse response = dealService.getDealById(deal.getId(), admin.getEmail());
        assertNotNull(response);
        assertEquals(deal.getId(), response.getId());
    }

    @Test
    @DisplayName("getDealById: Third party is blocked with AccessDeniedException")
    void testGetDealById_ThirdPartyBlocked() {
        when(userRepository.findByEmail(stranger.getEmail())).thenReturn(Optional.of(stranger));
        when(dealRepository.findById(deal.getId())).thenReturn(Optional.of(deal));

        assertThrows(AccessDeniedException.class, () ->
                dealService.getDealById(deal.getId(), stranger.getEmail()));
    }

    @Test
    @DisplayName("getMyDeals: Role-based filtering for buyer, seller, and admin")
    void testGetMyDeals_RoleFiltering() {
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(dealRepository.findByBuyerIdOrderByCreatedAtDesc(buyer.getId())).thenReturn(List.of(deal));

        List<DealResponse> buyerDeals = dealService.getMyDeals(buyer.getEmail());
        assertEquals(1, buyerDeals.size());

        when(userRepository.findByEmail(seller.getEmail())).thenReturn(Optional.of(seller));
        when(dealRepository.findBySellerIdOrderByCreatedAtDesc(seller.getId())).thenReturn(List.of(deal));

        List<DealResponse> sellerDeals = dealService.getMyDeals(seller.getEmail());
        assertEquals(1, sellerDeals.size());

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(dealRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(deal));

        List<DealResponse> adminDeals = dealService.getMyDeals(admin.getEmail());
        assertEquals(1, adminDeals.size());
    }

    @Test
    @DisplayName("getDealsByBusiness: Seller owner and Admin allowed, non-owner denied")
    void testGetDealsByBusiness_Authorization() {
        when(userRepository.findByEmail(seller.getEmail())).thenReturn(Optional.of(seller));
        when(businessRepository.findById(business.getId())).thenReturn(Optional.of(business));
        when(dealRepository.findByBusinessIdOrderByCreatedAtDesc(business.getId())).thenReturn(List.of(deal));

        List<DealResponse> sellerResults = dealService.getDealsByBusiness(business.getId(), seller.getEmail());
        assertEquals(1, sellerResults.size());

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        List<DealResponse> adminResults = dealService.getDealsByBusiness(business.getId(), admin.getEmail());
        assertEquals(1, adminResults.size());

        when(userRepository.findByEmail(stranger.getEmail())).thenReturn(Optional.of(stranger));
        assertThrows(AccessDeniedException.class, () ->
                dealService.getDealsByBusiness(business.getId(), stranger.getEmail()));
    }

    @Test
    @DisplayName("confirmCompletion: First confirmation by Buyer records timestamp and leaves deal IN_PROGRESS")
    void testConfirmCompletion_BuyerFirst() {
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(dealRepository.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(dealRepository.save(any(Deal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DealResponse response = dealService.confirmCompletion(deal.getId(), buyer.getEmail());

        assertEquals("IN_PROGRESS", response.getStatus());
        assertNotNull(deal.getBuyerConfirmedAt());
        assertNull(deal.getSellerConfirmedAt());
        verify(notificationService).notify(eq(seller), contains("Counterparty Confirmed Completion"), anyString(), anyString());
        verify(auditService).record(eq(buyer), eq("DEAL_COMPLETION_CONFIRMED"), eq("DEAL"), eq(deal.getId()), anyString());
    }

    @Test
    @DisplayName("confirmCompletion: Double confirmation by the same party is idempotent")
    void testConfirmCompletion_DoubleConfirmationIdempotent() {
        deal.setBuyerConfirmedAt(LocalDateTime.now().minusHours(1));
        LocalDateTime originalTime = deal.getBuyerConfirmedAt();

        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(dealRepository.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(dealRepository.save(any(Deal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DealResponse response = dealService.confirmCompletion(deal.getId(), buyer.getEmail());

        assertEquals("IN_PROGRESS", response.getStatus());
        assertEquals(originalTime, deal.getBuyerConfirmedAt());
        // Should not send redundant notifications or audit logs on repeated confirmation
        verify(notificationService, never()).notify(any(), any(), any(), any());
        verify(auditService, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("confirmCompletion: Both parties confirm -> transitions to COMPLETED, marks Business SOLD")
    void testConfirmCompletion_BothConfirmed_TransitionsToCompleted() {
        deal.setBuyerConfirmedAt(LocalDateTime.now().minusHours(2));

        when(userRepository.findByEmail(seller.getEmail())).thenReturn(Optional.of(seller));
        when(dealRepository.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(dealRepository.save(any(Deal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DealResponse response = dealService.confirmCompletion(deal.getId(), seller.getEmail());

        assertEquals("COMPLETED", response.getStatus());
        assertNotNull(deal.getSellerConfirmedAt());
        assertNotNull(deal.getClosedAt());
        assertEquals(BusinessStatus.SOLD, business.getStatus());

        verify(businessRepository).save(business);
        verify(auditService).record(eq(seller), eq("DEAL_COMPLETED"), eq("DEAL"), eq(deal.getId()), contains(DealService.COMPLETION_NOTICE));
        verify(notificationService).notify(eq(buyer), eq("Deal Completed"), anyString(), anyString());
        verify(notificationService).notify(eq(seller), eq("Deal Completed"), anyString(), anyString());
    }

    @Test
    @DisplayName("confirmCompletion: Blocked when cancellation request is pending")
    void testConfirmCompletion_BlockedWhileCancellationPending() {
        deal.setCancellationRequestedAt(LocalDateTime.now());
        deal.setCancellationReason("Waiting on clarification");
        deal.setCancellationRequestedBy(buyer);

        when(userRepository.findByEmail(seller.getEmail())).thenReturn(Optional.of(seller));
        when(dealRepository.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                dealService.confirmCompletion(deal.getId(), seller.getEmail()));
        assertTrue(ex.getMessage().contains("cancellation request is pending"));
    }

    @Test
    @DisplayName("confirmCompletion: Blocked on already COMPLETED or CANCELLED deal")
    void testConfirmCompletion_InvalidDealStatus() {
        deal.setStatus(DealStatus.COMPLETED);
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(dealRepository.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));

        assertThrows(IllegalStateException.class, () ->
                dealService.confirmCompletion(deal.getId(), buyer.getEmail()));

        deal.setStatus(DealStatus.CANCELLED);
        assertThrows(IllegalStateException.class, () ->
                dealService.confirmCompletion(deal.getId(), buyer.getEmail()));
    }

    @Test
    @DisplayName("confirmCompletion: Third party user blocked")
    void testConfirmCompletion_ThirdPartyBlocked() {
        when(userRepository.findByEmail(stranger.getEmail())).thenReturn(Optional.of(stranger));
        when(dealRepository.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));

        assertThrows(AccessDeniedException.class, () ->
                dealService.confirmCompletion(deal.getId(), stranger.getEmail()));
    }

    @Test
    @DisplayName("requestCancellation: Participant requests cancellation successfully")
    void testRequestCancellation_Success() {
        RequestCancellationRequest req = RequestCancellationRequest.builder()
                .reason("Buyer financing fell through")
                .build();

        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(dealRepository.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(dealRepository.save(any(Deal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DealResponse response = dealService.requestCancellation(deal.getId(), buyer.getEmail(), req);

        assertTrue(response.isCancellationPending());
        assertEquals("Buyer financing fell through", response.getCancellationReason());
        assertEquals(buyer.getId(), response.getCancellationRequestedBy());
        verify(notificationService).notify(eq(seller), eq("Deal Cancellation Requested"), anyString(), anyString());
        verify(auditService).record(eq(buyer), eq("DEAL_CANCELLATION_REQUESTED"), eq("DEAL"), eq(deal.getId()), anyString());
    }

    @Test
    @DisplayName("requestCancellation: Blocked if cancellation already pending or missing reason")
    void testRequestCancellation_ConflictsAndValidation() {
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(dealRepository.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));

        deal.setCancellationRequestedAt(LocalDateTime.now());
        assertThrows(IllegalStateException.class, () ->
                dealService.requestCancellation(deal.getId(), buyer.getEmail(),
                        RequestCancellationRequest.builder().reason("Reason").build()));

        deal.setCancellationRequestedAt(null);
        assertThrows(IllegalArgumentException.class, () ->
                dealService.requestCancellation(deal.getId(), buyer.getEmail(),
                        RequestCancellationRequest.builder().reason("   ").build()));
    }

    @Test
    @DisplayName("respondCancellation: Counterparty agrees -> deal transitions to CANCELLED")
    void testRespondCancellation_Agree_CancelsDeal() {
        deal.setCancellationRequestedBy(buyer);
        deal.setCancellationReason("Buyer cannot proceed");
        deal.setCancellationRequestedAt(LocalDateTime.now());

        RespondCancellationRequest req = RespondCancellationRequest.builder()
                .agree(true)
                .build();

        when(userRepository.findByEmail(seller.getEmail())).thenReturn(Optional.of(seller));
        when(dealRepository.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(dealRepository.save(any(Deal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DealResponse response = dealService.respondCancellation(deal.getId(), seller.getEmail(), req);

        assertEquals("CANCELLED", response.getStatus());
        assertNotNull(deal.getClosedAt());
        verify(auditService).record(eq(seller), eq("DEAL_CANCELLED_BY_AGREEMENT"), eq("DEAL"), eq(deal.getId()), anyString());
        verify(notificationService).notify(eq(buyer), eq("Deal Cancelled"), anyString(), anyString());
        verify(notificationService).notify(eq(seller), eq("Deal Cancelled"), anyString(), anyString());
    }

    @Test
    @DisplayName("respondCancellation: Counterparty declines -> deal remains IN_PROGRESS and clears pending cancellation")
    void testRespondCancellation_Decline_RemainsInProgress() {
        deal.setCancellationRequestedBy(buyer);
        deal.setCancellationReason("Buyer cannot proceed");
        deal.setCancellationRequestedAt(LocalDateTime.now());

        RespondCancellationRequest req = RespondCancellationRequest.builder()
                .agree(false)
                .build();

        when(userRepository.findByEmail(seller.getEmail())).thenReturn(Optional.of(seller));
        when(dealRepository.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(dealRepository.save(any(Deal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DealResponse response = dealService.respondCancellation(deal.getId(), seller.getEmail(), req);

        assertEquals("IN_PROGRESS", response.getStatus());
        assertNull(deal.getCancellationRequestedAt());
        assertNull(deal.getCancellationRequestedBy());
        assertNull(deal.getCancellationReason());
        verify(auditService).record(eq(seller), eq("DEAL_CANCELLATION_DECLINED"), eq("DEAL"), eq(deal.getId()), anyString());
        verify(notificationService).notify(eq(buyer), eq("Cancellation Request Declined"), anyString(), anyString());
    }

    @Test
    @DisplayName("respondCancellation: Cannot respond to own cancellation request")
    void testRespondCancellation_RespondingToOwnRequestBlocked() {
        deal.setCancellationRequestedBy(buyer);
        deal.setCancellationReason("Buyer cannot proceed");
        deal.setCancellationRequestedAt(LocalDateTime.now());

        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(dealRepository.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                dealService.respondCancellation(deal.getId(), buyer.getEmail(),
                        RespondCancellationRequest.builder().agree(true).build()));
        assertTrue(ex.getMessage().contains("cannot respond to your own cancellation request"));
    }

    @Test
    @DisplayName("adminCancelDeal: Admin cancels deal with required reason")
    void testAdminCancelDeal_Success() {
        AdminCancelDealRequest req = AdminCancelDealRequest.builder()
                .reason("Platform compliance audit violation detected")
                .build();

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(dealRepository.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(dealRepository.save(any(Deal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DealResponse response = dealService.adminCancelDeal(deal.getId(), admin.getEmail(), req);

        assertEquals("CANCELLED", response.getStatus());
        assertNotNull(deal.getClosedAt());
        assertTrue(deal.getCancellationReason().contains("Platform compliance audit violation detected"));
        verify(auditService).record(eq(admin), eq("DEAL_ADMIN_CANCELLED"), eq("DEAL"), eq(deal.getId()), anyString());
        verify(notificationService).notify(eq(buyer), eq("Deal Cancelled by Admin"), anyString(), anyString());
        verify(notificationService).notify(eq(seller), eq("Deal Cancelled by Admin"), anyString(), anyString());
    }

    @Test
    @DisplayName("adminCancelDeal: Non-admin is blocked with AccessDeniedException")
    void testAdminCancelDeal_NonAdminBlocked() {
        AdminCancelDealRequest req = AdminCancelDealRequest.builder()
                .reason("Cancel")
                .build();

        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));

        assertThrows(AccessDeniedException.class, () ->
                dealService.adminCancelDeal(deal.getId(), buyer.getEmail(), req));
    }

    @Test
    @DisplayName("cancellation: Moderation status (REJECTED) applied during active deal is preserved after cancellation")
    void testCancellationPreservesModerationRejection() {
        // While deal is active, admin rejects the business listing
        business.setStatus(BusinessStatus.REJECTED);

        deal.setCancellationRequestedBy(buyer);
        deal.setCancellationReason("Buyer cannot secure financing");
        deal.setCancellationRequestedAt(LocalDateTime.now());

        when(userRepository.findByEmail(seller.getEmail())).thenReturn(Optional.of(seller));
        when(dealRepository.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(dealRepository.save(any(Deal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DealResponse response = dealService.respondCancellation(deal.getId(), seller.getEmail(),
                RespondCancellationRequest.builder().agree(true).build());

        assertEquals("CANCELLED", response.getStatus());
        // Verify business status is STILL REJECTED, not reset to APPROVED
        assertEquals(BusinessStatus.REJECTED, business.getStatus());
        verify(businessRepository, never()).save(any(Business.class));
    }

    @Test
    @DisplayName("adminCancelDeal: Moderation status (SUSPENDED seller) is preserved after admin cancellation")
    void testAdminCancellationPreservesSuspendedSeller() {
        // While deal is active, seller account is suspended by compliance
        seller.setStatus(AccountStatus.SUSPENDED);
        business.setStatus(BusinessStatus.REJECTED);

        AdminCancelDealRequest req = AdminCancelDealRequest.builder()
                .reason("Platform compliance audit violation detected")
                .build();

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(dealRepository.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(dealRepository.save(any(Deal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DealResponse response = dealService.adminCancelDeal(deal.getId(), admin.getEmail(), req);

        assertEquals("CANCELLED", response.getStatus());
        // Verify seller remains SUSPENDED and business remains REJECTED
        assertEquals(AccountStatus.SUSPENDED, seller.getStatus());
        assertEquals(BusinessStatus.REJECTED, business.getStatus());
        verify(businessRepository, never()).save(any(Business.class));
    }
}
