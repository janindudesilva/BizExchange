package com.businessexchange.analytics.service;

import com.businessexchange.analytics.dto.AnalyticsSummary;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.inquiry.repository.InquiryRepository;
import com.businessexchange.inquiry.repository.MessageRepository;
import com.businessexchange.review.repository.ReviewRepository;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final UserRepository userRepository;
    private final BusinessRepository businessRepository;
    private final InquiryRepository inquiryRepository;
    private final MessageRepository messageRepository;
    private final ReviewRepository reviewRepository;

    public AnalyticsSummary getAnalyticsSummary() {
        long totalUsers = userRepository.count();
        long totalBuyers = userRepository.countByRole(UserRole.BUYER);
        long totalSellers = userRepository.countByRole(UserRole.SELLER);
        long totalAdmins = userRepository.countByRole(UserRole.ADMIN);
        
        long totalBusinesses = businessRepository.count();
        long approvedBusinesses = businessRepository.countByStatus(com.businessexchange.business.entity.BusinessStatus.APPROVED);
        long pendingBusinesses = businessRepository.countByStatus(com.businessexchange.business.entity.BusinessStatus.PENDING_REVIEW);
        long rejectedBusinesses = businessRepository.countByStatus(com.businessexchange.business.entity.BusinessStatus.REJECTED);
        
        long totalInquiries = inquiryRepository.count();
        long activeInquiries = inquiryRepository.countByStatus(com.businessexchange.inquiry.entity.InquiryStatus.ACTIVE);
        long closedInquiries = inquiryRepository.countByStatus(com.businessexchange.inquiry.entity.InquiryStatus.CLOSED);
        
        long totalMessages = messageRepository.count();
        long totalReviews = reviewRepository.count();
        
        Double averageRating = reviewRepository.calculateAverageRatingAcrossAllSellers();

        return AnalyticsSummary.builder()
                .totalUsers(totalUsers)
                .totalBuyers(totalBuyers)
                .totalSellers(totalSellers)
                .totalAdmins(totalAdmins)
                .totalBusinesses(totalBusinesses)
                .approvedBusinesses(approvedBusinesses)
                .pendingBusinesses(pendingBusinesses)
                .rejectedBusinesses(rejectedBusinesses)
                .totalInquiries(totalInquiries)
                .activeInquiries(activeInquiries)
                .closedInquiries(closedInquiries)
                .totalMessages(totalMessages)
                .totalReviews(totalReviews)
                .averageRating(averageRating)
                .build();
    }
}
