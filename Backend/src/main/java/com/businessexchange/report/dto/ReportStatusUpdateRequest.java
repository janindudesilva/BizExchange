package com.businessexchange.report.dto;

import com.businessexchange.report.entity.ReportStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportStatusUpdateRequest {

    @NotNull(message = "Status is required")
    private ReportStatus status;

    private String resolutionNotes;

    private String adminInternalNotes;
}
