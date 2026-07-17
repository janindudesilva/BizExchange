package com.businessexchange.review.controller;

import com.businessexchange.common.response.ApiResponse;
import com.businessexchange.review.dto.ReviewCreateRequest;
import com.businessexchange.review.dto.ReviewResponse;
import com.businessexchange.review.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping("/seller/{sellerId}")
    @PreAuthorize("hasRole('BUYER')")
    public ApiResponse<ReviewResponse> createReview(
            @PathVariable Long sellerId,
            @Valid @RequestBody ReviewCreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        ReviewResponse response = reviewService.createReview(userDetails.getUsername(), sellerId, request);
        return ApiResponse.success("Review created successfully", response);
    }

    @GetMapping("/seller/{sellerId}")
    public ApiResponse<List<ReviewResponse>> getSellerReviews(@PathVariable Long sellerId) {
        List<ReviewResponse> response = reviewService.getSellerReviews(sellerId);
        return ApiResponse.success("Seller reviews fetched successfully", response);
    }

    @GetMapping("/seller/{sellerId}/average-rating")
    public ApiResponse<Double> getSellerAverageRating(@PathVariable Long sellerId) {
        Double rating = reviewService.getSellerAverageRating(sellerId);
        return ApiResponse.success("Average rating fetched successfully", rating);
    }

    @GetMapping("/seller/{sellerId}/count")
    public ApiResponse<Long> getSellerReviewCount(@PathVariable Long sellerId) {
        Long count = reviewService.getSellerReviewCount(sellerId);
        return ApiResponse.success("Review count fetched successfully", count);
    }
}
