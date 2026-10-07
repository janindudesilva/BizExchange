package com.businessexchange.verification.service;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.notification.service.NotificationService;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.verification.dto.VerificationDecisionRequest;
import com.businessexchange.verification.dto.VerificationRequestDto;
import com.businessexchange.verification.entity.VerificationRequest;
import com.businessexchange.verification.repository.VerificationRequestRepository;
import com.businessexchange.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VerificationService {

    private final VerificationRequestRepository verificationRequestRepository;
    private final BusinessRepository businessRepository;
    private final NotificationService notificationService;
    private final com.businessexchange.user.repository.UserRepository userRepository;
    private final com.businessexchange.common.audit.service.AuditService auditService;

    @Transactional
    public VerificationRequestDto submitForVerification(Long businessId) {
        throw new org.springframework.security.access.AccessDeniedException("Authentication required to submit for verification");
    }

    @Transactional
    public VerificationRequestDto submitForVerification(Long businessId, Long callerUserId) {
        if (callerUserId == null) {
            throw new org.springframework.security.access.AccessDeniedException("Authentication required to submit for verification");
        }

        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        User caller = userRepository.findById(callerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        boolean isAdmin = caller.getRole() == com.businessexchange.user.entity.UserRole.ADMIN;
        boolean isOwner = business.getSeller() != null && business.getSeller().getId().equals(callerUserId);
        if (!isAdmin && !isOwner) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "You do not have permission to submit this business for verification");
        }

        // If verification request already exists, re-activate it and reset obsolete decision metadata
        var existing = verificationRequestRepository.findByBusinessId(businessId);
        if (existing.isPresent()) {
            VerificationRequest request = existing.get();
            request.setStatus(VerificationStatus.PENDING);
            request.setRemarks(null);
            request.setVerifiedAt(null);
            request.setOfficer(null);
            business.setVerificationStatus(VerificationStatus.PENDING);
            businessRepository.save(business);
            auditService.record(caller, "VERIFICATION_SUBMITTED", "BUSINESS", businessId, "Resubmitted listing for verification");
            return mapToDto(verificationRequestRepository.save(request));
        }

        // Set business verification status to PENDING
        business.setVerificationStatus(VerificationStatus.PENDING);

        VerificationRequest request = VerificationRequest.builder()
                .business(business)
                .status(VerificationStatus.PENDING)
                .build();

        VerificationRequest saved = verificationRequestRepository.save(request);
        businessRepository.save(business);
        auditService.record(caller, "VERIFICATION_SUBMITTED", "BUSINESS", businessId, "Submitted listing for verification");

        return mapToDto(saved);
    }

    public VerificationRequestDto getById(Long id) {
        VerificationRequest request = verificationRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Verification request not found"));
        return mapToDto(request);
    }

    public VerificationRequestDto getByBusinessId(Long businessId) {
        VerificationRequest request = verificationRequestRepository.findByBusinessId(businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Verification request not found for business"));
        return mapToDto(request);
    }

    @Transactional
    public List<VerificationRequestDto> getPending() {
        // Sync any businesses marked PENDING that do not yet have a VerificationRequest record
        List<Business> pendingBusinesses = businessRepository.findAll().stream()
                .filter(b -> b.getVerificationStatus() == VerificationStatus.PENDING)
                .toList();

        for (Business b : pendingBusinesses) {
            if (verificationRequestRepository.findByBusinessId(b.getId()).isEmpty()) {
                VerificationRequest request = VerificationRequest.builder()
                        .business(b)
                        .status(VerificationStatus.PENDING)
                        .build();
                verificationRequestRepository.save(request);
            }
        }

        return verificationRequestRepository.findByStatusOrderByCreatedAtAsc(VerificationStatus.PENDING)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    public List<VerificationRequestDto> getByStatus(VerificationStatus status) {
        return verificationRequestRepository.findByStatusOrderByCreatedAtAsc(status)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    public List<VerificationRequestDto> getByOfficerId(Long officerId) {
        return verificationRequestRepository.findByOfficerIdOrderByCreatedAtDesc(officerId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    public List<VerificationRequestDto> getAll() {
        return verificationRequestRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    private User getValidOfficer(Long officerId) {
        User officer = userRepository.findById(officerId)
                .orElseThrow(() -> new ResourceNotFoundException("Officer not found"));
        if (officer.getRole() != com.businessexchange.user.entity.UserRole.VERIFICATION_OFFICER 
                && officer.getRole() != com.businessexchange.user.entity.UserRole.ADMIN) {
            throw new IllegalArgumentException("User is not authorized as a verification officer");
        }
        return officer;
    }

    private VerificationRequest getRequestById(Long requestId) {
        return verificationRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Verification request not found for id: " + requestId));
    }

    @Transactional
    public VerificationRequestDto assignToOfficer(Long requestId, Long officerId) {
        VerificationRequest request = getRequestById(requestId);

        User officer = getValidOfficer(officerId);

        request.setOfficer(officer);
        VerificationRequest saved = verificationRequestRepository.save(request);
        auditService.record(officer, "VERIFICATION_ASSIGNED", "VERIFICATION_REQUEST", requestId, "Assigned to officer: " + officer.getFullName());

        return mapToDto(saved);
    }

    @Transactional
    public VerificationRequestDto approve(Long requestId, Long officerId) {
        VerificationRequest request = getRequestById(requestId);

        User officer = getValidOfficer(officerId);

        request.setOfficer(officer);
        request.setStatus(VerificationStatus.APPROVED);
        request.setVerifiedAt(LocalDateTime.now());

        Business business = request.getBusiness();
        business.setVerificationStatus(VerificationStatus.APPROVED);

        VerificationRequest saved = verificationRequestRepository.save(request);
        businessRepository.save(business);
        auditService.record(officer, "VERIFICATION_APPROVED", "VERIFICATION_REQUEST", requestId, "Officer verified business: " + business.getTitle());

        // Notify seller that verification passed and admin approval is now pending
        notificationService.notify(
                business.getSeller(),
                "BUSINESS_VERIFIED",
                "Your business listing '" + business.getTitle() + "' has been verified by our verification officer and is now pending administrator publication review.",
                "/seller/businesses"
        );

        return mapToDto(saved);
    }

    @Transactional
    public VerificationRequestDto reject(Long requestId, Long officerId, String remarks) {
        VerificationRequest request = getRequestById(requestId);

        User officer = getValidOfficer(officerId);

        request.setOfficer(officer);
        request.setStatus(VerificationStatus.REJECTED);
        request.setRemarks(remarks);
        request.setVerifiedAt(LocalDateTime.now());

        Business business = request.getBusiness();
        business.setVerificationStatus(VerificationStatus.REJECTED);

        VerificationRequest saved = verificationRequestRepository.save(request);
        businessRepository.save(business);
        auditService.record(officer, "VERIFICATION_REJECTED", "VERIFICATION_REQUEST", requestId, "Officer rejected business: " + business.getTitle() + ". Reason: " + remarks);

        // Notify seller
        notificationService.notify(
                business.getSeller(),
                "BUSINESS_REJECTED",
                "Your business listing '" + business.getTitle() + "' was rejected. Reason: " + remarks,
                "/seller/businesses"
        );

        return mapToDto(saved);
    }

    @Transactional
    public VerificationRequestDto requestMoreInfo(Long requestId, Long officerId, String remarks) {
        VerificationRequest request = getRequestById(requestId);

        User officer = getValidOfficer(officerId);

        request.setOfficer(officer);
        request.setStatus(VerificationStatus.NEEDS_MORE_INFORMATION);
        request.setRemarks(remarks);

        Business business = request.getBusiness();
        business.setVerificationStatus(VerificationStatus.NEEDS_MORE_INFORMATION);

        VerificationRequest saved = verificationRequestRepository.save(request);
        businessRepository.save(business);
        auditService.record(officer, "VERIFICATION_INFO_REQUESTED", "VERIFICATION_REQUEST", requestId, "More information requested for business: " + business.getTitle() + ". Remarks: " + remarks);

        // Notify seller
        notificationService.notify(
                business.getSeller(),
                "BUSINESS_NEEDS_INFO",
                "Your business listing '" + business.getTitle() + "' needs more information. " + remarks,
                "/seller/businesses"
        );

        return mapToDto(saved);
    }

    private VerificationRequestDto mapToDto(VerificationRequest request) {
        return VerificationRequestDto.builder()
                .id(request.getId())
                .businessId(request.getBusiness().getId())
                .businessTitle(request.getBusiness().getTitle())
                .sellerName(request.getBusiness().getSeller().getFullName())
                .officerId(request.getOfficer() != null ? request.getOfficer().getId() : null)
                .officerName(request.getOfficer() != null ? request.getOfficer().getFullName() : null)
                .status(request.getStatus().name())
                .remarks(request.getRemarks())
                .verifiedAt(request.getVerifiedAt())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }
}
