package com.businessexchange.business.controller;

import com.businessexchange.business.dto.BusinessResponse;
import com.businessexchange.business.service.AdminBusinessService;
import com.businessexchange.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/businesses")
@RequiredArgsConstructor
public class AdminBusinessController {

    private final AdminBusinessService adminBusinessService;

    @PutMapping("/{businessId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<BusinessResponse> approveBusiness(
            @PathVariable Long businessId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails
    ) {
        String adminEmail = userDetails.getUsername();
        BusinessResponse response = adminBusinessService.approveBusiness(businessId, adminEmail);
        return ApiResponse.success("Business approved successfully", response);
    }

    @PutMapping("/{businessId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<BusinessResponse> rejectBusiness(
            @PathVariable Long businessId,
            @RequestParam String reason,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails
    ) {
        String adminEmail = userDetails.getUsername();
        BusinessResponse response = adminBusinessService.rejectBusiness(businessId, adminEmail, reason);
        return ApiResponse.success("Business rejected successfully", response);
    }

    @GetMapping("/pending")

    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<BusinessResponse>> getPendingBusinesses() {
    List<BusinessResponse> response = adminBusinessService.getPendingBusinesses();
    return ApiResponse.success("Pending businesses fetched successfully", response);
    }
}
