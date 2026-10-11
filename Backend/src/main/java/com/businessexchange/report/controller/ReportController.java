package com.businessexchange.report.controller;

import com.businessexchange.common.response.ApiResponse;
import com.businessexchange.report.dto.ReportAdminResponse;
import com.businessexchange.report.dto.ReportBuyerResponse;
import com.businessexchange.report.dto.ReportCreateRequest;
import com.businessexchange.report.dto.ReportStatusUpdateRequest;
import com.businessexchange.report.entity.ReportStatus;
import com.businessexchange.report.entity.ReportTargetType;
import com.businessexchange.report.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @PostMapping
    @PreAuthorize("hasRole('BUYER')")
    public ApiResponse<ReportBuyerResponse> createReport(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ReportCreateRequest request) {
        ReportBuyerResponse response = reportService.createReport(userDetails.getUsername(), request);
        return ApiResponse.success("Report submitted successfully for administrator review", response);
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('BUYER')")
    public ApiResponse<List<ReportBuyerResponse>> getMyReports(@AuthenticationPrincipal UserDetails userDetails) {
        List<ReportBuyerResponse> response = reportService.getMyReports(userDetails.getUsername());
        return ApiResponse.success("My reports fetched successfully", response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Object> getReportById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        Object response = reportService.getReportById(id, userDetails.getUsername());
        return ApiResponse.success("Report details fetched successfully", response);
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<ReportAdminResponse>> getAllReportsAdmin(
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(required = false) ReportTargetType targetType) {
        List<ReportAdminResponse> response = reportService.getAllReportsAdmin(status, targetType);
        return ApiResponse.success("All platform reports fetched successfully", response);
    }

    @PutMapping("/admin/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<ReportAdminResponse> updateReportStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ReportStatusUpdateRequest request) {
        ReportAdminResponse response = reportService.updateReportStatus(id, userDetails.getUsername(), request);
        return ApiResponse.success("Report status updated successfully", response);
    }
}
