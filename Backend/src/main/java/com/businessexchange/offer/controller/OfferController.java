package com.businessexchange.offer.controller;

import com.businessexchange.common.response.ApiResponse;
import com.businessexchange.offer.dto.OfferCreateRequest;
import com.businessexchange.offer.dto.OfferResponse;
import com.businessexchange.offer.dto.RejectOfferRequest;
import com.businessexchange.offer.service.OfferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/offers")
@RequiredArgsConstructor
public class OfferController {

    private final OfferService offerService;

    @PostMapping
    @PreAuthorize("hasRole('BUYER')")
    public ApiResponse<OfferResponse> createOffer(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody OfferCreateRequest request) {
        OfferResponse response = offerService.createOffer(userDetails.getUsername(), request);
        return ApiResponse.success("Offer submitted successfully", response);
    }

    @PutMapping("/{id}/withdraw")
    @PreAuthorize("hasRole('BUYER')")
    public ApiResponse<OfferResponse> withdrawOffer(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        OfferResponse response = offerService.withdrawOffer(id, userDetails.getUsername());
        return ApiResponse.success("Offer withdrawn successfully", response);
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('SELLER')")
    public ApiResponse<OfferResponse> rejectOffer(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody(required = false) RejectOfferRequest request) {
        OfferResponse response = offerService.rejectOffer(id, userDetails.getUsername(), request);
        return ApiResponse.success("Offer rejected successfully", response);
    }

    @PutMapping("/{id}/accept")
    @PreAuthorize("hasRole('SELLER')")
    public ApiResponse<OfferResponse> acceptOffer(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        OfferResponse response = offerService.acceptOffer(id, userDetails.getUsername());
        return ApiResponse.success("Offer accepted and deal created successfully", response);
    }

    @GetMapping("/sent")
    @PreAuthorize("hasRole('BUYER')")
    public ApiResponse<List<OfferResponse>> getSentOffers(@AuthenticationPrincipal UserDetails userDetails) {
        List<OfferResponse> response = offerService.getSentOffers(userDetails.getUsername());
        return ApiResponse.success("Sent offers fetched successfully", response);
    }

    @GetMapping("/received")
    @PreAuthorize("hasRole('SELLER')")
    public ApiResponse<List<OfferResponse>> getReceivedOffers(@AuthenticationPrincipal UserDetails userDetails) {
        List<OfferResponse> response = offerService.getReceivedOffers(userDetails.getUsername());
        return ApiResponse.success("Received offers fetched successfully", response);
    }

    @GetMapping("/business/{businessId}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ApiResponse<List<OfferResponse>> getOffersByBusiness(
            @PathVariable Long businessId,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<OfferResponse> response = offerService.getOffersByBusiness(businessId, userDetails.getUsername());
        return ApiResponse.success("Business offers fetched successfully", response);
    }

    @GetMapping("/inquiry/{inquiryId}")
    @PreAuthorize("hasRole('BUYER') or hasRole('SELLER') or hasRole('ADMIN')")
    public ApiResponse<List<OfferResponse>> getOffersByInquiry(
            @PathVariable Long inquiryId,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<OfferResponse> response = offerService.getOffersByInquiry(inquiryId, userDetails.getUsername());
        return ApiResponse.success("Inquiry offers fetched successfully", response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<OfferResponse> getOfferById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        OfferResponse response = offerService.getOfferById(id, userDetails.getUsername());
        return ApiResponse.success("Offer fetched successfully", response);
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<OfferResponse>> getAllOffersAdmin() {
        List<OfferResponse> response = offerService.getAllOffersAdmin();
        return ApiResponse.success("All platform offers fetched successfully", response);
    }
}
