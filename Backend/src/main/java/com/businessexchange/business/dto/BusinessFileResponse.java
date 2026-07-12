package com.businessexchange.business.dto;

import com.businessexchange.business.entity.BusinessFile;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class BusinessFileResponse {
    private Long id;
    private String fileType;
    private String originalName;
    private String url;
    private LocalDateTime uploadedAt;

    public static BusinessFileResponse from(BusinessFile file) {
        return BusinessFileResponse.builder()
                .id(file.getId())
                .fileType(file.getFileType().name())
                .originalName(file.getOriginalName())
                .url("/businesses/files/" + file.getId())
                .uploadedAt(file.getUploadedAt())
                .build();
    }
}