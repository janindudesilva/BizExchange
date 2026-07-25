package com.businessexchange.seller.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReportSuspiciousRequest {
    @NotBlank
    private String reason;
}
