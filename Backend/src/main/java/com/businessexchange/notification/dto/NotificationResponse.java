package com.businessexchange.notification.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NotificationResponse {
    private Long id;
    private String title;
    private String message;
    private String status;
    private String createdAt;
    private String readAt;
}
