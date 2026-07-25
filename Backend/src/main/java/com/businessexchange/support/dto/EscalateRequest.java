package com.businessexchange.support.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EscalateRequest {
    @NotBlank
    private String reason;
}
