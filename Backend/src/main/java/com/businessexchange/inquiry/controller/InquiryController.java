package com.businessexchange.inquiry.controller;

import com.businessexchange.common.response.ApiResponse;
import com.businessexchange.inquiry.dto.InquiryCreateRequest;
import com.businessexchange.inquiry.dto.InquiryResponse;
import com.businessexchange.inquiry.service.InquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inquiries")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService inquiryService;

    @PostMapping
    @PreAuthorize("hasRole('BUYER')")
    public ApiResponse<InquiryResponse> sendInquiry(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody InquiryCreateRequest request) {
        InquiryResponse response = inquiryService.createInquiry(userDetails.getUsername(), request);
        return ApiResponse.success("Inquiry sent successfully", response);
    }

    @GetMapping("/{id}")
    public ApiResponse<InquiryResponse> getInquiryById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        InquiryResponse response = inquiryService.getInquiryById(id, userDetails.getUsername());
        return ApiResponse.success("Inquiry fetched successfully", response);
    }

    @GetMapping("/sent")
    @PreAuthorize("hasRole('BUYER')")
    public ApiResponse<List<InquiryResponse>> getSentInquiries(@AuthenticationPrincipal UserDetails userDetails) {
        List<InquiryResponse> response = inquiryService.getSentInquiries(userDetails.getUsername());
        return ApiResponse.success("Sent inquiries fetched successfully", response);
    }

    @GetMapping("/received")
    @PreAuthorize("hasRole('SELLER')")
    public ApiResponse<List<InquiryResponse>> getReceivedInquiries(@AuthenticationPrincipal UserDetails userDetails) {
        List<InquiryResponse> response = inquiryService.getReceivedInquiries(userDetails.getUsername());
        return ApiResponse.success("Received inquiries fetched successfully", response);
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('SELLER')")
    public ApiResponse<InquiryResponse> approveInquiry(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        InquiryResponse response = inquiryService.approveInquiry(id, userDetails.getUsername());
        return ApiResponse.success("Inquiry approved — chat is now open", response);
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('SELLER')")
    public ApiResponse<InquiryResponse> rejectInquiry(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        InquiryResponse response = inquiryService.rejectInquiry(id, userDetails.getUsername());
        return ApiResponse.success("Inquiry rejected", response);
    }

    @PutMapping("/{id}/close")
    @PreAuthorize("hasRole('SELLER') or hasRole('BUYER')")
    public ApiResponse<InquiryResponse> closeInquiry(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        InquiryResponse response = inquiryService.closeInquiry(id, userDetails.getUsername());
        return ApiResponse.success("Conversation closed", response);
    }
}
