package com.businessexchange.inquiry.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class InquiryCreateRequest {

    @NotNull(message = "businessId is required")
    private Long businessId;

    @NotBlank(message = "message is required")
    private String message;
}
