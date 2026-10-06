package com.businessexchange.business.service;

import com.businessexchange.business.dto.BusinessResponse;
import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessStatus;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.notification.service.NotificationService;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
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
    public BusinessResponse approveBusiness(Long businessId, String adminEmail) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));

        if (admin.getRole() != UserRole.ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException("Only administrators can approve businesses");
        }

        business.setStatus(BusinessStatus.APPROVED);
        // Ensure verification status is approved so listing appears publicly
        if (business.getVerificationStatus() == null || business.getVerificationStatus() == com.businessexchange.seller.entity.VerificationStatus.PENDING) {
            business.setVerificationStatus(com.businessexchange.seller.entity.VerificationStatus.APPROVED);
        }
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
    public BusinessResponse rejectBusiness(Long businessId, String adminEmail, String reason) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));

        if (admin.getRole() != UserRole.ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException("Only administrators can reject businesses");
        }

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
        List<Business> pending = businessRepository.findByStatus(BusinessStatus.PENDING_REVIEW);
        return businessService.mapListToResponses(pending, null);
    }
}
