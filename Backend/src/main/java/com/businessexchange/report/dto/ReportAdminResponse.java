package com.businessexchange.report.dto;

import com.businessexchange.report.entity.ReportCategory;
import com.businessexchange.report.entity.ReportStatus;
import com.businessexchange.report.entity.ReportTargetType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportAdminResponse {

    private Long id;
    private Long reporterId;
    private String reporterName;
    private String reporterEmail;
    private ReportTargetType targetType;
    private Long targetId;
    private String targetTitle;
    private String targetOwnerOrSellerEmail;
    private ReportCategory category;
    private String description;
    private ReportStatus status;
    private String resolutionNotes;
    private String adminInternalNotes;
    private Long resolvedByAdminId;
    private String resolvedByAdminName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime resolvedAt;
}
