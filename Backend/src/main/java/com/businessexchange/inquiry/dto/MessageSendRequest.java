package com.businessexchange.inquiry.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MessageSendRequest {

    @NotBlank(message = "message is required")
    private String message;
}
