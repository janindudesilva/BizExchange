package com.businessexchange.business.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class BusinessUpdateRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 200)
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    @NotBlank(message = "Location is required")
    @Size(max = 200)
    private String location;

    private String address;

    @NotNull(message = "Asking price is required")
    @Positive(message = "Asking price must be positive")
    private BigDecimal askingPrice;

    private String category;
    private Integer businessAgeYears;
    private Integer numberOfEmployees;
    private String reasonForSelling;
}