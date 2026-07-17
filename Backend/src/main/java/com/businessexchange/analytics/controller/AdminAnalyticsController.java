package com.businessexchange.analytics.controller;

import com.businessexchange.analytics.dto.AnalyticsSummary;
import com.businessexchange.analytics.service.AnalyticsService;
import com.businessexchange.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminAnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/summary")
    public ApiResponse<AnalyticsSummary> getAnalyticsSummary() {
        AnalyticsSummary summary = analyticsService.getAnalyticsSummary();
        return ApiResponse.success("Analytics summary fetched successfully", summary);
    }
}
