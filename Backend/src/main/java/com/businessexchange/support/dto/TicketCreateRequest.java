package com.businessexchange.support.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TicketCreateRequest {
    @NotBlank
    @Size(max = 200)
    private String subject;

    @NotBlank
    private String description;
}
