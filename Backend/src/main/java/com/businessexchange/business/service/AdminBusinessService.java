package com.businessexchange.business.service;

import com.businessexchange.business.dto.BusinessResponse;
import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessStatus;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.notification.service.NotificationService;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminBusinessService {

    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;
    private final BusinessService businessService;
    private final NotificationService notificationService;

    @Transactional
    public BusinessResponse approveBusiness(Long businessId, Long adminId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));

        business.setStatus(BusinessStatus.APPROVED);
        business.setApprovedBy(admin);
        business.setApprovedAt(LocalDateTime.now());
        business.setRejectionReason(null);

        Business saved = businessRepository.save(business);

        // Notify seller that business was approved
        notificationService.createNotification(
                business.getSeller().getId(),
                "Business Approved",
                String.format("Your business listing '%s' has been approved and is now live!", business.getTitle())
        );

        return businessService.mapToResponse(saved);
    }

    @Transactional
    public BusinessResponse rejectBusiness(Long businessId, Long adminId, String reason) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));

        business.setStatus(BusinessStatus.REJECTED);
        business.setApprovedBy(admin);
        business.setApprovedAt(null);
        business.setRejectionReason(reason);

        Business saved = businessRepository.save(business);

        // Notify seller that business was rejected
        notificationService.createNotification(
                business.getSeller().getId(),
                "Business Rejected",
                String.format("Your business listing '%s' has been rejected. Reason: %s", business.getTitle(), reason)
        );

        return businessService.mapToResponse(saved);
    }

    public List<BusinessResponse> getPendingBusinesses() {
    return businessRepository.findByStatus(BusinessStatus.PENDING_REVIEW)
            .stream()
            .map(businessService::mapToResponse)
            .toList();
}
}
