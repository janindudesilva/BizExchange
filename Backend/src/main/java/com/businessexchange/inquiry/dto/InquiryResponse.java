package com.businessexchange.inquiry.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class InquiryResponse {
    private Long id;
    private Long businessId;
    private String businessTitle;
    private Long buyerId;
    private String buyerName;
    private Long sellerId;
    private String sellerName;
    private String initialMessage;
    private String status;
    private LocalDateTime createdAt;
    private Boolean hasReviewed;
    private Double sellerRating;
    private Long sellerReviewCount;
}
