package com.businessexchange.offer.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OfferCreateRequest {

    @NotNull(message = "Business ID is required")
    private Long businessId;

    private Long inquiryId;

    @NotNull(message = "Offer amount is required")
    @DecimalMin(value = "1.00", message = "Offer amount must be at least 1.00")
    @Digits(integer = 13, fraction = 2, message = "Offer amount cannot exceed 13 integer digits and 2 decimal places")
    private BigDecimal amount;

    @Pattern(regexp = "^(LKR)$", message = "Offer currency must match the listing currency (LKR)")
    private String currency;

    @Size(max = 2000, message = "Message cannot exceed 2000 characters")
    private String message;

    private LocalDateTime expiresAt;
}
