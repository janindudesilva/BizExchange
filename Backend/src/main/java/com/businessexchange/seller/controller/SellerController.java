package com.businessexchange.seller.controller;

import com.businessexchange.business.dto.BusinessFileResponse;
import com.businessexchange.business.service.BusinessFileService;
import com.businessexchange.common.response.ApiResponse;
import com.businessexchange.seller.dto.RejectSellerRequest;
import com.businessexchange.seller.dto.ReviewNotesRequest;
import com.businessexchange.seller.dto.ReportSuspiciousRequest;
import com.businessexchange.seller.dto.SellerProfileResponseDto;
import com.businessexchange.seller.service.SellerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/sellers")
@RequiredArgsConstructor
public class SellerController {

    private final SellerService sellerService;
    private final BusinessFileService businessFileService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('VERIFICATION_OFFICER')")
    public ApiResponse<List<SellerProfileResponseDto>> getAllSellers() {
        return ApiResponse.success("Sellers fetched successfully", sellerService.getAllSellers());
    }

    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN') or hasRole('VERIFICATION_OFFICER')")
    public ApiResponse<List<SellerProfileResponseDto>> getPendingSellers() {
        return ApiResponse.success("Pending sellers fetched successfully", sellerService.getPendingSellers());
    }

    @GetMapping("/{sellerId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('VERIFICATION_OFFICER')")
    public ApiResponse<SellerProfileResponseDto> getSeller(@PathVariable Long sellerId) {
        return ApiResponse.success("Seller fetched successfully", sellerService.getSellerById(sellerId));
    }

    @PutMapping("/{sellerId}/approve")
    @PreAuthorize("hasRole('ADMIN') or hasRole('VERIFICATION_OFFICER')")
    public ApiResponse<SellerProfileResponseDto> approveSeller(@PathVariable Long sellerId) {
        return ApiResponse.success("Seller approved successfully", sellerService.approveSeller(sellerId));
    }

    @PutMapping("/{sellerId}/reject")
    @PreAuthorize("hasRole('ADMIN') or hasRole('VERIFICATION_OFFICER')")
    public ApiResponse<SellerProfileResponseDto> rejectSeller(
            @PathVariable Long sellerId,
            @RequestBody @Valid RejectSellerRequest request) {
        return ApiResponse.success("Seller rejected successfully", sellerService.rejectSeller(sellerId, request.getReason()));
    }

    @PutMapping("/{sellerId}/notes")
    @PreAuthorize("hasRole('ADMIN') or hasRole('VERIFICATION_OFFICER')")
    public ApiResponse<SellerProfileResponseDto> addNotes(
            @PathVariable Long sellerId,
            @RequestBody @Valid ReviewNotesRequest request) {
        return ApiResponse.success("Review notes added successfully", sellerService.addReviewNotes(sellerId, request.getNotes()));
    }

    @PutMapping("/{sellerId}/report-suspicious")
    @PreAuthorize("hasRole('ADMIN') or hasRole('VERIFICATION_OFFICER')")
    public ApiResponse<Void> reportSuspicious(
            @PathVariable Long sellerId,
            @RequestBody @Valid ReportSuspiciousRequest request) {
        sellerService.flagSuspicious(sellerId, request.getReason());
        return ApiResponse.success("Seller flagged as suspicious", null);
    }

    @GetMapping("/{sellerId}/documents")
    @PreAuthorize("hasRole('ADMIN') or hasRole('VERIFICATION_OFFICER')")
    public ApiResponse<List<BusinessFileResponse>> getSellerDocuments(@PathVariable Long sellerId) {
        return ApiResponse.success("Seller documents fetched successfully", businessFileService.findAllDocumentsBySellerId(sellerId));
    }
}