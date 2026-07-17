package com.businessexchange.business.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class BusinessResponse {
    private Long id;
    private String title;
    private String category;
    private String sellerName;
    private String description;
    private String location;
    private BigDecimal askingPrice;
    private String status;
    private String rejectionReason;
    private Boolean isFavorited;
    private Long sellerId;
    private Double averageRating;
    private Long reviewCount;
}
