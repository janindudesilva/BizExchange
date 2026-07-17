package com.businessexchange.review.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReviewResponse {
    private Long id;
    private Long sellerId;
    private String sellerName;
    private Long buyerId;
    private String buyerName;
    private Integer rating;
    private String comment;
    private String createdAt;
}
