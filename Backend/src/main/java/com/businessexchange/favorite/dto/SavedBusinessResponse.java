package com.businessexchange.favorite.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class SavedBusinessResponse {
    private Long id;
    private Long businessId;
    private String title;
    private String category;
    private String sellerName;
    private String description;
    private String location;
    private BigDecimal askingPrice;
    private String status;
    private String savedAt;
}
