package com.businessexchange.seller.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReviewNotesRequest {
    @NotBlank
    private String notes;
}
