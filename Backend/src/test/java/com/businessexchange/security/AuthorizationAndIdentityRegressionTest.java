package com.businessexchange.security;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessStatus;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.business.service.AdminBusinessService;
import com.businessexchange.business.service.BusinessService;
import com.businessexchange.common.exception.DuplicateResourceException;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.inquiry.entity.Inquiry;
import com.businessexchange.inquiry.entity.InquiryStatus;
import com.businessexchange.inquiry.repository.InquiryRepository;
import com.businessexchange.notification.service.NotificationService;
import com.businessexchange.review.dto.ReviewCreateRequest;
import com.businessexchange.review.repository.ReviewRepository;
import com.businessexchange.review.service.ReviewService;
import com.businessexchange.support.entity.SupportTicket;
import com.businessexchange.support.entity.TicketPriority;
import com.businessexchange.support.entity.TicketStatus;
import com.businessexchange.support.repository.SupportTicketRepository;
import com.businessexchange.support.service.TicketService;
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

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthorizationAndIdentityRegressionTest {

    // AdminBusinessService dependencies
    @Mock
    private BusinessRepository businessRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BusinessService businessService;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private AdminBusinessService adminBusinessService;

    // ReviewService dependencies
    @Mock
    private ReviewRepository reviewRepository;
    @Mock
    private InquiryRepository inquiryRepository;

    @InjectMocks
    private ReviewService reviewService;

    // TicketService dependencies
    @Mock
    private SupportTicketRepository ticketRepository;

    @InjectMocks
    private TicketService ticketService;

    private User adminUser;
    private User normalUser;
    private User sellerUser;
    private User supportUser;
    private Business pendingBusiness;

    @BeforeEach
    void setUp() {
        adminUser = new User();
        adminUser.setId(1L);
        adminUser.setEmail("admin@bizexchange.com");
        adminUser.setRole(UserRole.ADMIN);

        normalUser = new User();
        normalUser.setId(2L);
        normalUser.setEmail("buyer@bizexchange.com");
        normalUser.setRole(UserRole.BUYER);

        sellerUser = new User();
        sellerUser.setId(3L);
        sellerUser.setEmail("seller@bizexchange.com");
        sellerUser.setRole(UserRole.SELLER);

        supportUser = new User();
        supportUser.setId(4L);
        supportUser.setEmail("agent@bizexchange.com");
        supportUser.setRole(UserRole.SUPPORT_AGENT);

        pendingBusiness = Business.builder()
                .id(100L)
                .title("Pending Cafe")
                .status(BusinessStatus.PENDING_REVIEW)
                .seller(sellerUser)
                .build();
    }

    // ── Admin Authorization Tests ─────────────────────────────────────────────

    @Test
    @DisplayName("ATTACK: Non-admin user attempting to approve a business listing must be rejected")
    void testNonAdminCannotApproveBusiness() {
        when(businessRepository.findById(100L)).thenReturn(Optional.of(pendingBusiness));
        when(userRepository.findByEmail(normalUser.getEmail())).thenReturn(Optional.of(normalUser));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                adminBusinessService.approveBusiness(100L, normalUser.getEmail())
        );

        assertTrue(ex.getMessage().contains("Only administrators can approve businesses"));
        verify(businessRepository, never()).save(any());
    }

    @Test
    @DisplayName("ATTACK: Non-admin user attempting to reject a business listing must be rejected")
    void testNonAdminCannotRejectBusiness() {
        when(businessRepository.findById(100L)).thenReturn(Optional.of(pendingBusiness));
        when(userRepository.findByEmail(normalUser.getEmail())).thenReturn(Optional.of(normalUser));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                adminBusinessService.rejectBusiness(100L, normalUser.getEmail(), "Fraudulent")
        );

        assertTrue(ex.getMessage().contains("Only administrators can reject businesses"));
        verify(businessRepository, never()).save(any());
    }

    // ── Review Security Tests ─────────────────────────────────────────────────

    @Test
    @DisplayName("ATTACK: Seller attempting to review themselves must be rejected")
    void testSelfReviewRejected() {
        when(userRepository.findByEmail(sellerUser.getEmail())).thenReturn(Optional.of(sellerUser));

        ReviewCreateRequest request = new ReviewCreateRequest();
        request.setRating(5);
        request.setComment("I am the best seller!");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                reviewService.createReview(sellerUser.getEmail(), sellerUser.getId(), request)
        );

        assertTrue(ex.getMessage().contains("cannot review yourself"));
        verify(reviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("ATTACK: Buyer attempting review without a closed inquiry must be rejected")
    void testReviewWithoutClosedInquiryRejected() {
        when(userRepository.findByEmail(normalUser.getEmail())).thenReturn(Optional.of(normalUser));
        when(userRepository.findById(sellerUser.getId())).thenReturn(Optional.of(sellerUser));
        when(inquiryRepository.findByBuyerIdAndSellerId(normalUser.getId(), sellerUser.getId()))
                .thenReturn(List.of()); // No closed inquiries

        ReviewCreateRequest request = new ReviewCreateRequest();
        request.setRating(4);
        request.setComment("Great seller");

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                reviewService.createReview(normalUser.getEmail(), sellerUser.getId(), request)
        );

        assertTrue(ex.getMessage().contains("only review sellers with whom you have a closed inquiry"));
        verify(reviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("ATTACK: Duplicate review submission must be rejected with DuplicateResourceException")
    void testDuplicateReviewRejected() {
        when(userRepository.findByEmail(normalUser.getEmail())).thenReturn(Optional.of(normalUser));
        when(userRepository.findById(sellerUser.getId())).thenReturn(Optional.of(sellerUser));

        Inquiry closedInquiry = Inquiry.builder()
                .id(1L)
                .status(InquiryStatus.CLOSED)
                .build();
        when(inquiryRepository.findByBuyerIdAndSellerId(normalUser.getId(), sellerUser.getId()))
                .thenReturn(List.of(closedInquiry));

        when(reviewRepository.existsByBuyerIdAndSellerId(normalUser.getId(), sellerUser.getId()))
                .thenReturn(true);

        ReviewCreateRequest request = new ReviewCreateRequest();
        request.setRating(5);
        request.setComment("Review again");

        DuplicateResourceException ex = assertThrows(DuplicateResourceException.class, () ->
                reviewService.createReview(normalUser.getEmail(), sellerUser.getId(), request)
        );

        assertTrue(ex.getMessage().contains("already reviewed this seller"));
        verify(reviewRepository, never()).save(any());
    }

    // ── Ticket Assignment Authorization Tests ──────────────────────────────────

    @Test
    @DisplayName("ATTACK: Assigning support ticket to a user without SUPPORT_AGENT or ADMIN role must be rejected")
    void testTicketAssignmentToNonStaffRejected() {
        SupportTicket ticket = SupportTicket.builder()
                .id(10L)
                .subject("Need help")
                .status(TicketStatus.OPEN)
                .priority(TicketPriority.MEDIUM)
                .build();

        when(ticketRepository.findById(10L)).thenReturn(Optional.of(ticket));
        when(userRepository.findById(normalUser.getId())).thenReturn(Optional.of(normalUser));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                ticketService.assign(10L, normalUser.getId())
        );

        assertTrue(ex.getMessage().contains("SUPPORT_AGENT or ADMIN"));
        verify(ticketRepository, never()).save(any());
    }

    @Test
    @DisplayName("AUTHORIZATION: Assigning support ticket to a legitimate SUPPORT_AGENT succeeds")
    void testTicketAssignmentToSupportAgentAllowed() {
        SupportTicket ticket = SupportTicket.builder()
                .id(10L)
                .subject("Need help")
                .status(TicketStatus.OPEN)
                .priority(TicketPriority.MEDIUM)
                .build();

        when(ticketRepository.findById(10L)).thenReturn(Optional.of(ticket));
        when(userRepository.findById(supportUser.getId())).thenReturn(Optional.of(supportUser));

        ticketService.assign(10L, supportUser.getId());

        assertEquals(supportUser, ticket.getAssignedTo());
        assertEquals(TicketStatus.IN_PROGRESS, ticket.getStatus());
        verify(ticketRepository).save(ticket);
    }
}
