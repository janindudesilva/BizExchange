package com.businessexchange.deal.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RespondCancellationRequest {

    @NotNull(message = "Agreement decision is required")
    private Boolean agree;
}
