package com.businessexchange.inquiry.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MessageResponse {
    private Long id;
    private Long inquiryId;
    private Long senderId;
    private String senderName;
    private String message;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
