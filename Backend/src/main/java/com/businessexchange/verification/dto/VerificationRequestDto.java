package com.businessexchange.verification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerificationRequestDto {
    private Long id;
    private Long businessId;
    private String businessTitle;
    private String sellerName;
    private Long officerId;
    private String officerName;
    private String status;
    private String remarks;
    private LocalDateTime verifiedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
