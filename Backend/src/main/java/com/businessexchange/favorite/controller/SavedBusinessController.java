package com.businessexchange.favorite.controller;

import com.businessexchange.common.response.ApiResponse;
import com.businessexchange.favorite.dto.SavedBusinessResponse;
import com.businessexchange.favorite.service.SavedBusinessService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class SavedBusinessController {

    private final SavedBusinessService savedBusinessService;

    @PostMapping("/{businessId}")
    @PreAuthorize("hasRole('BUYER')")
    public ApiResponse<SavedBusinessResponse> saveBusiness(
            @PathVariable Long businessId,
            @AuthenticationPrincipal UserDetails userDetails) {
        SavedBusinessResponse response = savedBusinessService.saveBusiness(userDetails.getUsername(), businessId);
        return ApiResponse.success("Business saved to favorites", response);
    }

    @DeleteMapping("/{businessId}")
    @PreAuthorize("hasRole('BUYER')")
    public ApiResponse<Void> unsaveBusiness(
            @PathVariable Long businessId,
            @AuthenticationPrincipal UserDetails userDetails) {
        savedBusinessService.unsaveBusiness(userDetails.getUsername(), businessId);
        return ApiResponse.success("Business removed from favorites", null);
    }

    @GetMapping
    @PreAuthorize("hasRole('BUYER')")
    public ApiResponse<List<SavedBusinessResponse>> getSavedBusinesses(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<SavedBusinessResponse> response = savedBusinessService.getSavedBusinesses(userDetails.getUsername());
        return ApiResponse.success("Saved businesses fetched successfully", response);
    }

    @GetMapping("/{businessId}/check")
    @PreAuthorize("hasRole('BUYER')")
    public ApiResponse<Boolean> isBusinessSaved(
            @PathVariable Long businessId,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean isSaved = savedBusinessService.isBusinessSaved(userDetails.getUsername(), businessId);
        return ApiResponse.success("Favorite status checked", isSaved);
    }
}
