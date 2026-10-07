package com.businessexchange.inquiry;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessStatus;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.common.exception.DuplicateResourceException;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.inquiry.dto.InquiryCreateRequest;
import com.businessexchange.inquiry.dto.InquiryResponse;
import com.businessexchange.inquiry.entity.Inquiry;
import com.businessexchange.inquiry.entity.InquiryStatus;
import com.businessexchange.inquiry.entity.Message;
import com.businessexchange.inquiry.repository.InquiryRepository;
import com.businessexchange.inquiry.repository.MessageRepository;
import com.businessexchange.inquiry.service.InquiryService;
import com.businessexchange.notification.service.NotificationService;
import com.businessexchange.seller.entity.VerificationStatus;
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

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InquiryLifecycleRegressionTest {

    @Mock
    private InquiryRepository inquiryRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private BusinessRepository businessRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private com.businessexchange.review.service.ReviewService reviewService;

    @Mock
    private com.businessexchange.review.repository.ReviewRepository reviewRepository;

    @InjectMocks
    private InquiryService inquiryService;

    private User buyer;
    private User seller;
    private Business publishedBusiness;
    private Business unpublishedBusiness;

    @BeforeEach
    void setUp() {
        buyer = new User();
        buyer.setId(101L);
        buyer.setEmail("buyer@bizexchange.com");
        buyer.setFullName("Active Buyer");
        buyer.setRole(UserRole.BUYER);

        seller = new User();
        seller.setId(202L);
        seller.setEmail("seller@bizexchange.com");
        seller.setFullName("Listing Seller");
        seller.setRole(UserRole.SELLER);

        publishedBusiness = Business.builder()
                .id(1L)
                .title("Tech Solutions Lanka")
                .seller(seller)
                .status(BusinessStatus.APPROVED)
                .verificationStatus(VerificationStatus.APPROVED)
                .build();

        unpublishedBusiness = Business.builder()
                .id(2L)
                .title("Draft Listing")
                .seller(seller)
                .status(BusinessStatus.PENDING_REVIEW)
                .verificationStatus(VerificationStatus.PENDING)
                .build();
    }

    @Test
    @DisplayName("TASK 8: Inquiries on unpublished or pending listings are rejected")
    void testInquiryOnUnpublishedBusinessRejected() {
        InquiryCreateRequest request = new InquiryCreateRequest();
        request.setBusinessId(2L);
        request.setMessage("Interested in acquiring");

        when(userRepository.findByEmail("buyer@bizexchange.com")).thenReturn(Optional.of(buyer));
        when(businessRepository.findById(2L)).thenReturn(Optional.of(unpublishedBusiness));

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class, () ->
                inquiryService.createInquiry("buyer@bizexchange.com", request)
        );

        assertTrue(ex.getMessage().contains("not publicly available for inquiries"));
        verify(inquiryRepository, never()).save(any());
    }

    @Test
    @DisplayName("TASK 8: Duplicate active inquiry while one is already pending or active is blocked")
    void testDuplicateActiveInquiryBlocked() {
        InquiryCreateRequest request = new InquiryCreateRequest();
        request.setBusinessId(1L);
        request.setMessage("Second inquiry attempt");

        when(userRepository.findByEmail("buyer@bizexchange.com")).thenReturn(Optional.of(buyer));
        when(businessRepository.findById(1L)).thenReturn(Optional.of(publishedBusiness));
        when(inquiryRepository.existsByBusinessIdAndBuyerIdAndStatusIn(
                eq(1L), eq(101L), any(Set.class))).thenReturn(true);

        DuplicateResourceException ex = assertThrows(DuplicateResourceException.class, () ->
                inquiryService.createInquiry("buyer@bizexchange.com", request)
        );

        assertTrue(ex.getMessage().contains("already have an open inquiry"));
        verify(inquiryRepository, never()).save(any());
    }

    @Test
    @DisplayName("TASK 8: New inquiry is permitted after prior inquiry was rejected or closed")
    void testNewInquiryAllowedAfterPriorClosedOrRejected() {
        InquiryCreateRequest request = new InquiryCreateRequest();
        request.setBusinessId(1L);
        request.setMessage("Re-initiating inquiry under new terms");

        when(userRepository.findByEmail("buyer@bizexchange.com")).thenReturn(Optional.of(buyer));
        when(businessRepository.findById(1L)).thenReturn(Optional.of(publishedBusiness));
        when(inquiryRepository.existsByBusinessIdAndBuyerIdAndStatusIn(
                eq(1L), eq(101L), any(Set.class))).thenReturn(false);

        Inquiry savedInquiry = Inquiry.builder()
                .id(888L)
                .business(publishedBusiness)
                .buyer(buyer)
                .seller(seller)
                .status(InquiryStatus.PENDING_APPROVAL)
                .initialMessage("Re-initiating inquiry under new terms")
                .build();
        when(inquiryRepository.save(any(Inquiry.class))).thenReturn(savedInquiry);
        when(messageRepository.save(any(Message.class))).thenReturn(new Message());

        InquiryResponse response = inquiryService.createInquiry("buyer@bizexchange.com", request);

        assertNotNull(response);
        assertEquals("PENDING_APPROVAL", response.getStatus());
        verify(inquiryRepository).save(any(Inquiry.class));
        verify(messageRepository).save(any(Message.class));
    }
}
