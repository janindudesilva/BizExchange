package com.businessexchange.business.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BusinessResponse {
    private Long id;
    private String title;
    private String category;
    private String sellerName;
    private String description;
    private String location;
    private String address;
    private BigDecimal askingPrice;
    private Integer businessAgeYears;
    private Integer numberOfEmployees;
    private String reasonForSelling;
    private String status;
    private String verificationStatus;
    private String rejectionReason;
    private Boolean isFavorited;
    private Long sellerId;
    private Double averageRating;
    private Long reviewCount;
}
