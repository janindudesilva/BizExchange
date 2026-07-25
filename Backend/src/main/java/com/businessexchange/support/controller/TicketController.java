package com.businessexchange.support.controller;

import com.businessexchange.common.response.ApiResponse;
import com.businessexchange.support.dto.ReplyRequest;
import com.businessexchange.support.dto.TicketCreateRequest;
import com.businessexchange.support.dto.TicketMessageResponse;
import com.businessexchange.support.dto.TicketResponse;
import com.businessexchange.support.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @PostMapping
    @PreAuthorize("hasRole('BUYER') or hasRole('SELLER')")
    public ApiResponse<TicketResponse> create(@Valid @RequestBody TicketCreateRequest request) {
        Long userId = getCurrentUserId();
        TicketResponse response = ticketService.create(request, userId);
        return ApiResponse.success("Ticket created successfully", response);
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('BUYER') or hasRole('SELLER')")
    public ApiResponse<List<TicketResponse>> myTickets() {
        Long userId = getCurrentUserId();
        List<TicketResponse> tickets = ticketService.findByCreatedBy(userId);
        return ApiResponse.success("Fetched tickets", tickets);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('BUYER') or hasRole('SELLER')")
    public ApiResponse<TicketResponse> getTicket(@PathVariable Long id) {
        TicketResponse ticket = ticketService.getTicketWithMessages(id);
        return ApiResponse.success("Fetched ticket", ticket);
    }

    @PostMapping("/{id}/reply")
    @PreAuthorize("hasRole('BUYER') or hasRole('SELLER')")
    public ApiResponse<TicketMessageResponse> reply(
            @PathVariable Long id,
            @Valid @RequestBody ReplyRequest request) {
        Long userId = getCurrentUserId();
        TicketMessageResponse response = ticketService.reply(id, request.getMessage(), userId);
        return ApiResponse.success("Reply sent", response);
    }

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return Long.parseLong(authentication.getName());
    }
}
