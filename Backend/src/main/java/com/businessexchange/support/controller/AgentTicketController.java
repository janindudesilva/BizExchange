package com.businessexchange.support.controller;

import com.businessexchange.business.service.BusinessService;
import com.businessexchange.common.response.ApiResponse;
import com.businessexchange.common.util.AuthenticationUtil;
import com.businessexchange.support.dto.EscalateRequest;
import com.businessexchange.support.dto.LimitedBusinessView;
import com.businessexchange.support.dto.LimitedUserView;
import com.businessexchange.support.dto.ReplyRequest;
import com.businessexchange.support.dto.TicketMessageResponse;
import com.businessexchange.support.dto.TicketResponse;
import com.businessexchange.support.entity.TicketStatus;
import com.businessexchange.support.service.TicketService;
import com.businessexchange.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/agent/tickets")
@RequiredArgsConstructor
public class AgentTicketController {

    private final TicketService ticketService;
    private final UserService userService;
    private final BusinessService businessService;
    private final AuthenticationUtil authenticationUtil;

    @GetMapping("/assigned")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ApiResponse<List<TicketResponse>> myAssigned() {
        Long agentId = getCurrentUserId();
        List<TicketResponse> tickets = ticketService.findAssignedTo(agentId);
        return ApiResponse.success("Fetched assigned tickets", tickets);
    }

    @PostMapping("/{id}/reply")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ApiResponse<TicketMessageResponse> reply(
            @PathVariable Long id,
            @Valid @RequestBody ReplyRequest request) {
        Long agentId = getCurrentUserId();
        TicketMessageResponse response = ticketService.reply(id, request.getMessage(), agentId);
        return ApiResponse.success("Reply sent", response);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ApiResponse<TicketResponse> changeStatus(
            @PathVariable Long id,
            @RequestParam TicketStatus status) {
        Long agentId = getCurrentUserId();
        TicketResponse response = ticketService.updateStatus(id, status, agentId);
        return ApiResponse.success("Status updated", response);
    }

    @PostMapping("/{id}/escalate")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ApiResponse<Void> escalate(
            @PathVariable Long id,
            @Valid @RequestBody EscalateRequest request) {
        Long agentId = getCurrentUserId();
        ticketService.escalateToAdmin(id, request.getReason(), agentId);
        return ApiResponse.success("Escalated to admin", null);
    }

    @GetMapping("/users/{userId}")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ApiResponse<LimitedUserView> viewUser(@PathVariable Long userId) {
        LimitedUserView userView = userService.getLimitedView(userId);
        return ApiResponse.success("Fetched user", userView);
    }

    @GetMapping("/businesses/{businessId}")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ApiResponse<LimitedBusinessView> viewBusiness(@PathVariable Long businessId) {
        LimitedBusinessView businessView = businessService.getLimitedView(businessId);
        return ApiResponse.success("Fetched business", businessView);
    }

    private Long getCurrentUserId() {
        return authenticationUtil.getCurrentUserId();
    }
}
