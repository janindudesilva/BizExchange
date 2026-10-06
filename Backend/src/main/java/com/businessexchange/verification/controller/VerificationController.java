package com.businessexchange.verification.controller;

import com.businessexchange.business.dto.BusinessFileResponse;
import com.businessexchange.business.service.BusinessFileService;
import com.businessexchange.common.response.ApiResponse;
import com.businessexchange.common.util.AuthenticationUtil;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.verification.dto.VerificationDecisionRequest;
import com.businessexchange.verification.dto.VerificationRequestDto;
import com.businessexchange.verification.service.VerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/verification")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;
    private final BusinessFileService businessFileService;
    private final AuthenticationUtil authenticationUtil;

    @PostMapping("/submit/{businessId}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ApiResponse<VerificationRequestDto> submitForVerification(@PathVariable Long businessId) {
        VerificationRequestDto request = verificationService.submitForVerification(businessId);
        return ApiResponse.success("Submitted for verification", request);
    }

    @GetMapping("/pending")
    @PreAuthorize("hasRole('VERIFICATION_OFFICER') or hasRole('ADMIN')")
    public ApiResponse<List<VerificationRequestDto>> getPending() {
        List<VerificationRequestDto> requests = verificationService.getPending();
        return ApiResponse.success("Fetched pending verification requests", requests);
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('VERIFICATION_OFFICER') or hasRole('ADMIN')")
    public ApiResponse<List<VerificationRequestDto>> getByStatus(@PathVariable String status) {
        List<VerificationRequestDto> requests = verificationService.getByStatus(VerificationStatus.valueOf(status.toUpperCase()));
        return ApiResponse.success("Fetched verification requests by status", requests);
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('VERIFICATION_OFFICER') or hasRole('ADMIN')")
    public ApiResponse<List<VerificationRequestDto>> getAll() {
        List<VerificationRequestDto> requests = verificationService.getAll();
        return ApiResponse.success("Fetched all verification requests", requests);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('VERIFICATION_OFFICER') or hasRole('ADMIN')")
    public ApiResponse<VerificationRequestDto> getById(@PathVariable Long id) {
        VerificationRequestDto request = verificationService.getById(id);
        return ApiResponse.success("Fetched verification request", request);
    }

    @GetMapping("/business/{businessId}")
    @PreAuthorize("hasRole('VERIFICATION_OFFICER') or hasRole('ADMIN')")
    public ApiResponse<VerificationRequestDto> getByBusinessId(@PathVariable Long businessId) {
        VerificationRequestDto request = verificationService.getByBusinessId(businessId);
        return ApiResponse.success("Fetched verification request for business", request);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('VERIFICATION_OFFICER') or hasRole('ADMIN')")
    public ApiResponse<VerificationRequestDto> approve(@PathVariable Long id) {
        Long officerId = getCurrentUserId();
        VerificationRequestDto request = verificationService.approve(id, officerId);
        return ApiResponse.success("Business approved successfully", request);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('VERIFICATION_OFFICER') or hasRole('ADMIN')")
    public ApiResponse<VerificationRequestDto> reject(
            @PathVariable Long id,
            @Valid @RequestBody VerificationDecisionRequest request) {
        Long officerId = getCurrentUserId();
        VerificationRequestDto result = verificationService.reject(id, officerId, request.getRemarks());
        return ApiResponse.success("Business rejected successfully", result);
    }

    @PostMapping("/{id}/request-info")
    @PreAuthorize("hasRole('VERIFICATION_OFFICER') or hasRole('ADMIN')")
    public ApiResponse<VerificationRequestDto> requestMoreInfo(
            @PathVariable Long id,
            @Valid @RequestBody VerificationDecisionRequest request) {
        Long officerId = getCurrentUserId();
        VerificationRequestDto result = verificationService.requestMoreInfo(id, officerId, request.getRemarks());
        return ApiResponse.success("Requested more information successfully", result);
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasRole('VERIFICATION_OFFICER') or hasRole('ADMIN')")
    public ApiResponse<VerificationRequestDto> assignToOfficer(
            @PathVariable Long id,
            @RequestParam Long officerId) {
        VerificationRequestDto request = verificationService.assignToOfficer(id, officerId);
        return ApiResponse.success("Verification request assigned successfully", request);
    }

    @GetMapping("/{businessId}/documents")
    @PreAuthorize("hasRole('VERIFICATION_OFFICER') or hasRole('ADMIN')")
    public ApiResponse<List<BusinessFileResponse>> getBusinessDocuments(@PathVariable Long businessId) {
        List<BusinessFileResponse> documents = businessFileService.getFilesForBusiness(businessId);
        return ApiResponse.success("Fetched business documents", documents);
    }

    @GetMapping("/files/{fileId}")
    @PreAuthorize("hasRole('VERIFICATION_OFFICER') or hasRole('ADMIN')")
    public ResponseEntity<byte[]> serveFile(@PathVariable Long fileId) {
        return businessFileService.serveFile(fileId);
    }

    private Long getCurrentUserId() {
        return authenticationUtil.getCurrentUserId();
    }
}
