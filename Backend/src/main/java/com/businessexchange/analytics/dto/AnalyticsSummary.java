package com.businessexchange.analytics.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AnalyticsSummary {
    private Long totalUsers;
    private Long totalBuyers;
    private Long totalSellers;
    private Long totalAdmins;
    private Long totalBusinesses;
    private Long approvedBusinesses;
    private Long pendingBusinesses;
    private Long rejectedBusinesses;
    private Long totalInquiries;
    private Long activeInquiries;
    private Long closedInquiries;
    private Long totalMessages;
    private Long totalReviews;
    private Double averageRating;
}
