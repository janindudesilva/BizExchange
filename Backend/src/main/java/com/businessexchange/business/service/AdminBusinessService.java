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
    private final com.businessexchange.verification.repository.VerificationRequestRepository verificationRequestRepository;
    private final com.businessexchange.common.audit.service.AuditService auditService;

    @Transactional
    public BusinessResponse approveBusiness(Long businessId, String adminEmail) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));

        if (admin.getRole() != UserRole.ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException("Only administrators can approve businesses");
        }

        if (business.getStatus() == BusinessStatus.APPROVED) {
            throw new IllegalStateException("Business is already approved and published");
        }

        if (business.getStatus() == BusinessStatus.REJECTED) {
            throw new IllegalStateException("Cannot publish a rejected business without re-verification");
        }

        if (business.getVerificationStatus() != com.businessexchange.seller.entity.VerificationStatus.APPROVED) {
            throw new IllegalStateException("Business cannot be published without prior verification officer approval");
        }

        business.setStatus(BusinessStatus.APPROVED);
        business.setVerificationStatus(com.businessexchange.seller.entity.VerificationStatus.APPROVED);
        business.setApprovedBy(admin);
        business.setApprovedAt(LocalDateTime.now());
        business.setRejectionReason(null);

        // Atomically synchronize VerificationRequest so no stale pending requests remain
        verificationRequestRepository.findByBusinessId(businessId).ifPresent(vr -> {
            vr.setStatus(com.businessexchange.seller.entity.VerificationStatus.APPROVED);
            vr.setVerifiedAt(LocalDateTime.now());
            if (vr.getOfficer() == null) {
                vr.setOfficer(admin);
            }
            verificationRequestRepository.save(vr);
        });

        Business saved = businessRepository.save(business);
        auditService.record(admin, "BUSINESS_APPROVED", "BUSINESS", businessId, "Listing approved and published by admin");

        // Notify seller that business was approved and is now live
        notificationService.createNotification(
                business.getSeller().getId(),
                "Business Approved",
                String.format("Your business listing '%s' has been approved and is now live!", business.getTitle())
        );

        return businessService.mapToResponse(saved, adminEmail);
    }

    @Transactional
    public BusinessResponse rejectBusiness(Long businessId, String adminEmail, String reason) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("Reason is required for rejection");
        }

        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));

        if (admin.getRole() != UserRole.ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException("Only administrators can reject businesses");
        }

        if (business.getStatus() == BusinessStatus.REJECTED) {
            throw new IllegalStateException("Business is already rejected");
        }

        business.setStatus(BusinessStatus.REJECTED);
        business.setVerificationStatus(com.businessexchange.seller.entity.VerificationStatus.REJECTED);
        business.setApprovedBy(admin);
        business.setApprovedAt(null);
        business.setRejectionReason(reason.trim());

        // Atomically synchronize VerificationRequest
        verificationRequestRepository.findByBusinessId(businessId).ifPresent(vr -> {
            vr.setStatus(com.businessexchange.seller.entity.VerificationStatus.REJECTED);
            vr.setRemarks(reason);
            vr.setVerifiedAt(LocalDateTime.now());
            if (vr.getOfficer() == null) {
                vr.setOfficer(admin);
            }
            verificationRequestRepository.save(vr);
        });

        Business saved = businessRepository.save(business);
        auditService.record(admin, "BUSINESS_REJECTED", "BUSINESS", businessId, "Listing rejected by admin: " + reason);

        // Notify seller that business was rejected
        notificationService.createNotification(
                business.getSeller().getId(),
                "Business Rejected",
                String.format("Your business listing '%s' has been rejected. Reason: %s", business.getTitle(), reason)
        );

        return businessService.mapToResponse(saved, adminEmail);
    }

    public List<BusinessResponse> getPendingBusinesses() {
        List<Business> pending = businessRepository.findByStatus(BusinessStatus.PENDING_REVIEW).stream()
                .filter(b -> b.getVerificationStatus() == com.businessexchange.seller.entity.VerificationStatus.APPROVED)
                .toList();
        return businessService.mapListToResponses(pending, null);
    }
}
