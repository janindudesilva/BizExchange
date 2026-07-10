package com.businessexchange.business.controller;

import com.businessexchange.business.dto.BusinessCreateRequest;
import com.businessexchange.business.dto.BusinessResponse;
import com.businessexchange.business.service.BusinessService;
import com.businessexchange.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/businesses")
@RequiredArgsConstructor
public class BusinessController {

    private final BusinessService businessService;

    @PostMapping
    public ApiResponse<BusinessResponse> createBusiness(@Valid @RequestBody BusinessCreateRequest request) {
        BusinessResponse response = businessService.createBusiness(request);
        return ApiResponse.success("Business submitted for review", response);
    }

    @GetMapping
    public ApiResponse<List<BusinessResponse>> getApprovedBusinesses() {
        List<BusinessResponse> response = businessService.getApprovedBusinesses();
        return ApiResponse.success("Approved businesses fetched successfully", response);
    }

    @GetMapping("/{id}")
    public ApiResponse<BusinessResponse> getBusinessById(@PathVariable Long id) {
        BusinessResponse response = businessService.getBusinessById(id);
        return ApiResponse.success("Business fetched successfully", response);
    }

    @GetMapping("/seller/{sellerId}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ApiResponse<List<BusinessResponse>> getBusinessesBySeller(@PathVariable Long sellerId) {
        List<BusinessResponse> response = businessService.getBusinessesBySeller(sellerId);
        return ApiResponse.success("Seller businesses fetched successfully", response);
    }
}
