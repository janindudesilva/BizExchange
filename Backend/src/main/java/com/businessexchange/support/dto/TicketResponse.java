package com.businessexchange.support.dto;

import com.businessexchange.support.entity.TicketPriority;
import com.businessexchange.support.entity.TicketStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketResponse {
    private Long id;
    private String ticketNumber;
    private Long createdById;
    private String createdByName;
    private String createdByEmail;
    private Long assignedToId;
    private String assignedToName;
    private String subject;
    private String description;
    private TicketStatus status;
    private TicketPriority priority;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
