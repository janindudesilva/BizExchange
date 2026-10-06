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

    @Transactional
    public VerificationRequestDto submitForVerification(Long businessId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        // If verification request already exists, return it or re-activate if needed
        var existing = verificationRequestRepository.findByBusinessId(businessId);
        if (existing.isPresent()) {
            VerificationRequest request = existing.get();
            request.setStatus(VerificationStatus.PENDING);
            business.setVerificationStatus(VerificationStatus.PENDING);
            businessRepository.save(business);
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

    private VerificationRequest findRequestByIdOrBusinessId(Long id) {
        return verificationRequestRepository.findById(id)
                .or(() -> verificationRequestRepository.findByBusinessId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Verification request not found for id: " + id));
    }

    @Transactional
    public VerificationRequestDto assignToOfficer(Long requestId, Long officerId) {
        VerificationRequest request = findRequestByIdOrBusinessId(requestId);

        User officer = getValidOfficer(officerId);

        request.setOfficer(officer);
        VerificationRequest saved = verificationRequestRepository.save(request);

        return mapToDto(saved);
    }

    @Transactional
    public VerificationRequestDto approve(Long requestId, Long officerId) {
        VerificationRequest request = findRequestByIdOrBusinessId(requestId);

        User officer = getValidOfficer(officerId);

        request.setOfficer(officer);
        request.setStatus(VerificationStatus.APPROVED);
        request.setVerifiedAt(LocalDateTime.now());

        Business business = request.getBusiness();
        business.setVerificationStatus(VerificationStatus.APPROVED);

        VerificationRequest saved = verificationRequestRepository.save(request);
        businessRepository.save(business);

        // Notify seller
        notificationService.notify(
                business.getSeller(),
                "BUSINESS_VERIFIED",
                "Your business listing '" + business.getTitle() + "' has been verified and is now live.",
                "/seller/my-businesses"
        );

        return mapToDto(saved);
    }

    @Transactional
    public VerificationRequestDto reject(Long requestId, Long officerId, String remarks) {
        VerificationRequest request = findRequestByIdOrBusinessId(requestId);

        User officer = getValidOfficer(officerId);

        request.setOfficer(officer);
        request.setStatus(VerificationStatus.REJECTED);
        request.setRemarks(remarks);
        request.setVerifiedAt(LocalDateTime.now());

        Business business = request.getBusiness();
        business.setVerificationStatus(VerificationStatus.REJECTED);

        VerificationRequest saved = verificationRequestRepository.save(request);
        businessRepository.save(business);

        // Notify seller
        notificationService.notify(
                business.getSeller(),
                "BUSINESS_REJECTED",
                "Your business listing '" + business.getTitle() + "' was rejected. Reason: " + remarks,
                "/seller/my-businesses"
        );

        return mapToDto(saved);
    }

    @Transactional
    public VerificationRequestDto requestMoreInfo(Long requestId, Long officerId, String remarks) {
        VerificationRequest request = findRequestByIdOrBusinessId(requestId);

        User officer = getValidOfficer(officerId);

        request.setOfficer(officer);
        request.setStatus(VerificationStatus.NEEDS_MORE_INFORMATION);
        request.setRemarks(remarks);

        Business business = request.getBusiness();
        business.setVerificationStatus(VerificationStatus.NEEDS_MORE_INFORMATION);

        VerificationRequest saved = verificationRequestRepository.save(request);
        businessRepository.save(business);

        // Notify seller
        notificationService.notify(
                business.getSeller(),
                "BUSINESS_NEEDS_INFO",
                "Your business listing '" + business.getTitle() + "' needs more information. " + remarks,
                "/seller/my-businesses"
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
