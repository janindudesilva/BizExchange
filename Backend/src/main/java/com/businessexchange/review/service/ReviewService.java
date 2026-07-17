package com.businessexchange.review.service;

import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.inquiry.entity.Inquiry;
import com.businessexchange.inquiry.entity.InquiryStatus;
import com.businessexchange.inquiry.repository.InquiryRepository;
import com.businessexchange.review.dto.ReviewCreateRequest;
import com.businessexchange.review.dto.ReviewResponse;
import com.businessexchange.review.entity.Review;
import com.businessexchange.review.repository.ReviewRepository;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final InquiryRepository inquiryRepository;

    @Transactional
    public ReviewResponse createReview(String buyerEmail, Long sellerId, ReviewCreateRequest request) {
        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer not found"));

        User seller = userRepository.findById(sellerId)
                .orElseThrow(() -> new ResourceNotFoundException("Seller not found"));

        // Check if buyer has a closed inquiry with this seller
        boolean hasClosedInquiry = inquiryRepository.findByBuyerIdAndSellerId(buyer.getId(), sellerId)
                .stream()
                .anyMatch(inquiry -> inquiry.getStatus() == InquiryStatus.CLOSED);

        if (!hasClosedInquiry) {
            throw new AccessDeniedException(
                    "You can only review sellers with whom you have a closed inquiry"
            );
        }

        // Check if review already exists
        if (reviewRepository.findByBuyerIdAndSellerId(buyer.getId(), sellerId).isPresent()) {
            throw new IllegalStateException("You have already reviewed this seller");
        }

        Review review = Review.builder()
                .seller(seller)
                .buyer(buyer)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        Review saved = reviewRepository.save(review);

        return mapToResponse(saved);
    }

    public List<ReviewResponse> getSellerReviews(Long sellerId) {
        User seller = userRepository.findById(sellerId)
                .orElseThrow(() -> new ResourceNotFoundException("Seller not found"));

        return reviewRepository.findBySellerIdOrderByCreatedAtDesc(sellerId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public Double getSellerAverageRating(Long sellerId) {
        User seller = userRepository.findById(sellerId)
                .orElseThrow(() -> new ResourceNotFoundException("Seller not found"));

        return reviewRepository.calculateAverageRating(sellerId);
    }

    public Long getSellerReviewCount(Long sellerId) {
        User seller = userRepository.findById(sellerId)
                .orElseThrow(() -> new ResourceNotFoundException("Seller not found"));

        return reviewRepository.countBySellerId(sellerId);
    }

    private ReviewResponse mapToResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .sellerId(review.getSeller().getId())
                .sellerName(review.getSeller().getFullName())
                .buyerId(review.getBuyer().getId())
                .buyerName(review.getBuyer().getFullName())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt().toString())
                .build();
    }
}
