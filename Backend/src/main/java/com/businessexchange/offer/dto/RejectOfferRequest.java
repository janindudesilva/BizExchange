package com.businessexchange.offer.dto;

import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RejectOfferRequest {

    @Size(max = 1000, message = "Rejection reason cannot exceed 1000 characters")
    private String reason;
}
