package com.businessexchange.deal.controller;

import com.businessexchange.common.response.ApiResponse;
import com.businessexchange.deal.dto.*;
import com.businessexchange.deal.service.DealService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/deals")
@RequiredArgsConstructor
public class DealController {

    private final DealService dealService;

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<DealResponse>> getMyDeals(@AuthenticationPrincipal UserDetails userDetails) {
        List<DealResponse> response = dealService.getMyDeals(userDetails.getUsername());
        return ApiResponse.success("My deals fetched successfully", response);
    }

    @GetMapping("/business/{businessId}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ApiResponse<List<DealResponse>> getDealsByBusiness(
            @PathVariable Long businessId,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<DealResponse> response = dealService.getDealsByBusiness(businessId, userDetails.getUsername());
        return ApiResponse.success("Business deals fetched successfully", response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<DealResponse> getDealById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        DealResponse response = dealService.getDealById(id, userDetails.getUsername());
        return ApiResponse.success("Deal fetched successfully", response);
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<DealResponse> confirmCompletion(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        DealResponse response = dealService.confirmCompletion(id, userDetails.getUsername());
        return ApiResponse.success("Offline completion confirmed successfully", response);
    }

    @PostMapping("/{id}/request-cancellation")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<DealResponse> requestCancellation(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody RequestCancellationRequest request) {
        DealResponse response = dealService.requestCancellation(id, userDetails.getUsername(), request);
        return ApiResponse.success("Cancellation requested successfully", response);
    }

    @PostMapping("/{id}/respond-cancellation")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<DealResponse> respondCancellation(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody RespondCancellationRequest request) {
        DealResponse response = dealService.respondCancellation(id, userDetails.getUsername(), request);
        return ApiResponse.success("Cancellation response processed successfully", response);
    }

    @PostMapping("/{id}/admin-cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<DealResponse> adminCancelDeal(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AdminCancelDealRequest request) {
        DealResponse response = dealService.adminCancelDeal(id, userDetails.getUsername(), request);
        return ApiResponse.success("Deal cancelled by administrator successfully", response);
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<DealResponse>> getAllDealsAdmin() {
        List<DealResponse> response = dealService.getAllDealsAdmin();
        return ApiResponse.success("All platform deals fetched successfully", response);
    }
}
