package com.businessexchange.support.controller;

import com.businessexchange.common.response.ApiResponse;
import com.businessexchange.support.dto.TicketResponse;
import com.businessexchange.support.service.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/tickets")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminTicketController {

    private final TicketService ticketService;

    @GetMapping
    public ApiResponse<List<TicketResponse>> getAllTickets() {
        List<TicketResponse> tickets = ticketService.findAll();
        return ApiResponse.success("Fetched all tickets", tickets);
    }

    @PutMapping("/{ticketId}/assign/{agentId}")
    public ApiResponse<Void> assign(
            @PathVariable Long ticketId,
            @PathVariable Long agentId) {
        ticketService.assign(ticketId, agentId);
        return ApiResponse.success("Ticket assigned", null);
    }
}
