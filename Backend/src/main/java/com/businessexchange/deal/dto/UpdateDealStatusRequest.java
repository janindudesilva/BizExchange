package com.businessexchange.deal.dto;

import com.businessexchange.deal.entity.DealStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateDealStatusRequest {

    @NotNull(message = "Deal status is required")
    private DealStatus status;

    @Size(max = 2000, message = "Notes cannot exceed 2000 characters")
    private String notes;
}
