package com.businessexchange.inquiry.service;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.common.exception.DuplicateResourceException;
import com.businessexchange.common.exception.InvalidInquiryStateException;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.inquiry.dto.InquiryCreateRequest;
import com.businessexchange.inquiry.dto.InquiryResponse;
import com.businessexchange.inquiry.entity.Inquiry;
import com.businessexchange.inquiry.entity.InquiryStatus;
import com.businessexchange.inquiry.entity.Message;
import com.businessexchange.inquiry.repository.InquiryRepository;
import com.businessexchange.inquiry.repository.MessageRepository;
import com.businessexchange.notification.service.NotificationService;
import com.businessexchange.review.repository.ReviewRepository;
import com.businessexchange.review.service.ReviewService;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class InquiryService {

    // an inquiry is still "in play" for the duplicate-check while it's in either of these states
    private static final Set<InquiryStatus> ACTIVE_STATES =
            Set.of(InquiryStatus.PENDING_APPROVAL, InquiryStatus.ACTIVE);

    private final InquiryRepository inquiryRepository;
    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final NotificationService notificationService;
    private final ReviewService reviewService;
    private final ReviewRepository reviewRepository;

    @Transactional
    public InquiryResponse createInquiry(String buyerEmail, InquiryCreateRequest request) {
        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer not found"));

        Business business = businessRepository.findById(request.getBusinessId())
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        if (business.getSeller().getId().equals(buyer.getId())) {
            throw new DuplicateResourceException("You cannot send an inquiry on your own listing");
        }

        inquiryRepository.findByBusinessIdAndBuyerId(business.getId(), buyer.getId())
                .filter(existing -> ACTIVE_STATES.contains(existing.getStatus()))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException(
                            "You already have an open inquiry for this business");
                });

        Inquiry inquiry = Inquiry.builder()
                .business(business)
                .buyer(buyer)
                .seller(business.getSeller())
                .initialMessage(request.getMessage())
                .status(InquiryStatus.PENDING_APPROVAL)
                .build();
        Inquiry saved = inquiryRepository.save(inquiry);

        // the opening message also lives in the thread so the UI can render it like any other message
        Message opener = Message.builder()
                .inquiry(saved)
                .sender(buyer)
                .message(request.getMessage())
                .isRead(false)
                .build();
        messageRepository.save(opener);

        // Notify seller about new inquiry
        notificationService.createNotification(
                business.getSeller().getId(),
                "New Inquiry Received",
                String.format("You have a new inquiry for your business: %s", business.getTitle())
        );

        return mapToResponse(saved);
    }

    @Transactional
    public InquiryResponse approveInquiry(Long inquiryId, String sellerEmail) {
        Inquiry inquiry = getInquiryForSeller(inquiryId, sellerEmail);

        if (inquiry.getStatus() != InquiryStatus.PENDING_APPROVAL) {
            throw new InvalidInquiryStateException(
                    "Only a pending inquiry can be approved");
        }

        inquiry.setStatus(InquiryStatus.ACTIVE);
        Inquiry saved = inquiryRepository.save(inquiry);

        // Notify buyer that inquiry was approved
        notificationService.createNotification(
                inquiry.getBuyer().getId(),
                "Inquiry Approved",
                String.format("Your inquiry for %s has been approved. You can now start chatting!", inquiry.getBusiness().getTitle())
        );

        return mapToResponse(saved);
    }

    @Transactional
    public InquiryResponse rejectInquiry(Long inquiryId, String sellerEmail) {
        Inquiry inquiry = getInquiryForSeller(inquiryId, sellerEmail);

        if (inquiry.getStatus() != InquiryStatus.PENDING_APPROVAL) {
            throw new InvalidInquiryStateException(
                    "Only a pending inquiry can be rejected");
        }

        inquiry.setStatus(InquiryStatus.REJECTED);
        return mapToResponse(inquiryRepository.save(inquiry));
    }

    @Transactional
    public InquiryResponse closeInquiry(Long inquiryId, String requesterEmail) {
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new ResourceNotFoundException("Inquiry not found"));

        boolean isParticipant = inquiry.getBuyer().getId().equals(requester.getId())
                || inquiry.getSeller().getId().equals(requester.getId());
        if (!isParticipant) {
            throw new AccessDeniedException("You are not part of this inquiry");
        }

        if (inquiry.getStatus() != InquiryStatus.ACTIVE) {
            throw new InvalidInquiryStateException("Only an active conversation can be closed");
        }

        inquiry.setStatus(InquiryStatus.CLOSED);
        return mapToResponse(inquiryRepository.save(inquiry));
    }

    public InquiryResponse getInquiryById(Long inquiryId, String requesterEmail) {
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new ResourceNotFoundException("Inquiry not found"));

        boolean isParticipant = inquiry.getBuyer().getId().equals(requester.getId())
                || inquiry.getSeller().getId().equals(requester.getId());
        if (!isParticipant) {
            throw new AccessDeniedException("You are not part of this inquiry");
        }

        return mapToResponse(inquiry);
    }

    public List<InquiryResponse> getSentInquiries(String buyerEmail) {
        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer not found"));

        return inquiryRepository.findByBuyerIdOrderByCreatedAtDesc(buyer.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<InquiryResponse> getReceivedInquiries(String sellerEmail) {
        User seller = userRepository.findByEmail(sellerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Seller not found"));

        return inquiryRepository.findBySellerIdOrderByCreatedAtDesc(seller.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private Inquiry getInquiryForSeller(Long inquiryId, String sellerEmail) {
        User seller = userRepository.findByEmail(sellerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Seller not found"));

        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new ResourceNotFoundException("Inquiry not found"));

        if (!inquiry.getSeller().getId().equals(seller.getId())) {
            throw new AccessDeniedException("You are not the seller for this inquiry");
        }

        return inquiry;
    }

    private InquiryResponse mapToResponse(Inquiry inquiry) {
        // Check if buyer has reviewed seller
        Boolean hasReviewed = reviewRepository.findByBuyerIdAndSellerId(
                inquiry.getBuyer().getId(), inquiry.getSeller().getId()
        ).isPresent();

        // Get seller rating information
        Double sellerRating = reviewService.getSellerAverageRating(inquiry.getSeller().getId());
        Long sellerReviewCount = reviewService.getSellerReviewCount(inquiry.getSeller().getId());

        return InquiryResponse.builder()
                .id(inquiry.getId())
                .businessId(inquiry.getBusiness().getId())
                .businessTitle(inquiry.getBusiness().getTitle())
                .buyerId(inquiry.getBuyer().getId())
                .buyerName(inquiry.getBuyer().getFullName())
                .sellerId(inquiry.getSeller().getId())
                .sellerName(inquiry.getSeller().getFullName())
                .initialMessage(inquiry.getInitialMessage())
                .status(inquiry.getStatus().name())
                .createdAt(inquiry.getCreatedAt())
                .hasReviewed(hasReviewed)
                .sellerRating(sellerRating)
                .sellerReviewCount(sellerReviewCount)
                .build();
    }
}
