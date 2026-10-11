package com.businessexchange.review.service;

import com.businessexchange.common.exception.DuplicateResourceException;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.deal.entity.Deal;
import com.businessexchange.deal.entity.DealStatus;
import com.businessexchange.deal.repository.DealRepository;
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
    private final DealRepository dealRepository;

    @Transactional
    public ReviewResponse createReview(String buyerEmail, Long sellerId, ReviewCreateRequest request) {
        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer not found"));

        if (buyer.getId().equals(sellerId)) {
            throw new IllegalArgumentException("You cannot review yourself");
        }

        User seller = userRepository.findById(sellerId)
                .orElseThrow(() -> new ResourceNotFoundException("Seller not found"));

        // New reviews require a COMPLETED deal belonging to the buyer and seller concerned.
        // Closed inquiries no longer qualify.
        boolean hasCompletedDeal = dealRepository.existsByBuyerIdAndSellerIdAndStatus(
                buyer.getId(), sellerId, DealStatus.COMPLETED
        );

        if (!hasCompletedDeal) {
            throw new AccessDeniedException(
                    "You can only review sellers with whom you have a completed deal"
            );
        }

        // Reconcile and enforce one-review-per-buyer/seller rule explicitly
        if (reviewRepository.existsByBuyerIdAndSellerId(buyer.getId(), sellerId)) {
            throw new DuplicateResourceException("You have already reviewed this seller");
        }

        Deal completedDeal = dealRepository.findFirstByBuyerIdAndSellerIdAndStatusOrderByClosedAtDesc(
                buyer.getId(), sellerId, DealStatus.COMPLETED
        ).orElse(null);

        Review review = Review.builder()
                .seller(seller)
                .buyer(buyer)
                .deal(completedDeal)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        Review saved = reviewRepository.save(review);

        return mapToResponse(saved);
    }

    public List<ReviewResponse> getSellerReviews(Long sellerId) {
        if (!userRepository.existsById(sellerId)) {
            throw new ResourceNotFoundException("Seller not found");
        }

        return reviewRepository.findBySellerIdOrderByCreatedAtDesc(sellerId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public Double getSellerAverageRating(Long sellerId) {
        if (!userRepository.existsById(sellerId)) {
            throw new ResourceNotFoundException("Seller not found");
        }

        return reviewRepository.calculateAverageRating(sellerId);
    }

    public Long getSellerReviewCount(Long sellerId) {
        if (!userRepository.existsById(sellerId)) {
            throw new ResourceNotFoundException("Seller not found");
        }

        return reviewRepository.countBySellerId(sellerId);
    }

    private ReviewResponse mapToResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .sellerId(review.getSeller().getId())
                .sellerName(review.getSeller().getFullName())
                .buyerId(review.getBuyer().getId())
                .buyerName(review.getBuyer().getFullName())
                .dealId(review.getDeal() != null ? review.getDeal().getId() : null)
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt().toString())
                .build();
    }
}
