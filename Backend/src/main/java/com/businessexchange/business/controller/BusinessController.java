package com.businessexchange.business.controller;

import com.businessexchange.business.dto.BusinessCreateRequest;
import com.businessexchange.business.dto.BusinessFileResponse;
import com.businessexchange.business.dto.BusinessResponse;
import com.businessexchange.business.dto.BusinessUpdateRequest;
import com.businessexchange.business.service.BusinessFileService;
import com.businessexchange.business.service.BusinessService;
import com.businessexchange.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import com.businessexchange.common.response.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@RestController
@RequestMapping("/api/businesses")
@RequiredArgsConstructor
public class BusinessController {

    private final BusinessService businessService;
    private final BusinessFileService businessFileService;

    @PostMapping
    public ApiResponse<BusinessResponse> createBusiness(@Valid @RequestBody BusinessCreateRequest request) {
        BusinessResponse response = businessService.createBusiness(request);
        return ApiResponse.success("Business submitted for review", response);
    }

    @GetMapping
    public ApiResponse<PageResponse<BusinessResponse>> getApprovedBusinesses(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) String location,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Pageable pageable = PageRequest.of(page, size);
        String buyerEmail = userDetails != null ? userDetails.getUsername() : null;
        PageResponse<BusinessResponse> response = businessService.searchBusinesses(
                keyword, categoryId, minPrice, maxPrice, location, pageable, buyerEmail);
        return ApiResponse.success("Approved businesses fetched successfully", response);
    }

    @GetMapping("/{id}")
    public ApiResponse<BusinessResponse> getBusinessById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String buyerEmail = userDetails != null ? userDetails.getUsername() : null;
        BusinessResponse response = businessService.getBusinessById(id, buyerEmail);
        return ApiResponse.success("Business fetched successfully", response);
    }

    @GetMapping("/seller/{sellerId}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ApiResponse<List<BusinessResponse>> getBusinessesBySeller(@PathVariable Long sellerId) {
        List<BusinessResponse> response = businessService.getBusinessesBySeller(sellerId);
        return ApiResponse.success("Seller businesses fetched successfully", response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ApiResponse<BusinessResponse> updateBusiness(
            @PathVariable Long id,
            @Valid @RequestBody BusinessUpdateRequest request) {
        BusinessResponse response = businessService.updateBusiness(id, request);
        return ApiResponse.success("Business updated successfully", response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ApiResponse<Void> deleteBusiness(@PathVariable Long id) {
        businessService.deleteBusiness(id);
        return ApiResponse.success("Business deleted successfully", null);
    }

    // ── File endpoints ──

    @PostMapping("/{id}/files")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ApiResponse<List<BusinessFileResponse>> uploadFiles(
            @PathVariable Long id,
            @RequestParam(value = "images", required = false) List<MultipartFile> images,
            @RequestParam(value = "documents", required = false) List<MultipartFile> documents,
            @RequestParam(value = "financialReports", required = false) List<MultipartFile> financialReports
    ) throws IOException {
        List<BusinessFileResponse> files = businessFileService.uploadFiles(id, images, documents, financialReports);
        return ApiResponse.success("Files uploaded successfully", files);
    }

    @GetMapping("/files/{fileId}")
    public ResponseEntity<byte[]> serveFile(@PathVariable Long fileId) {
        return businessFileService.serveFile(fileId);
    }

    @GetMapping("/{id}/files")
    public ApiResponse<List<BusinessFileResponse>> getFilesForBusiness(@PathVariable Long id) {
        List<BusinessFileResponse> files = businessFileService.getFilesForBusiness(id);
        return ApiResponse.success("Files fetched successfully", files);
    }

    @DeleteMapping("/{businessId}/files/{fileId}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ApiResponse<Void> deleteFile(
            @PathVariable Long businessId,
            @PathVariable Long fileId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        businessFileService.deleteFile(businessId, fileId, userDetails.getUsername());
        return ApiResponse.success("File deleted successfully", null);
    }
}