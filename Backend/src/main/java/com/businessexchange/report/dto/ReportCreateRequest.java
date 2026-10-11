package com.businessexchange.report.dto;

import com.businessexchange.report.entity.ReportCategory;
import com.businessexchange.report.entity.ReportTargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportCreateRequest {

    @NotNull(message = "Target type is required")
    private ReportTargetType targetType;

    @NotNull(message = "Target ID is required")
    @Positive(message = "Target ID must be a positive number")
    private Long targetId;

    @NotNull(message = "Report reason category is required")
    private ReportCategory category;

    @NotBlank(message = "Description cannot be blank")
    @Size(min = 10, max = 2000, message = "Description must be between 10 and 2000 characters")
    private String description;
}
