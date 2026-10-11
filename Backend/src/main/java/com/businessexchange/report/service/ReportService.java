package com.businessexchange.report.service;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.common.audit.service.AuditService;
import com.businessexchange.common.exception.DuplicateResourceException;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.notification.service.NotificationService;
import com.businessexchange.report.dto.ReportAdminResponse;
import com.businessexchange.report.dto.ReportBuyerResponse;
import com.businessexchange.report.dto.ReportCreateRequest;
import com.businessexchange.report.dto.ReportStatusUpdateRequest;
import com.businessexchange.report.entity.Report;
import com.businessexchange.report.entity.ReportCategory;
import com.businessexchange.report.entity.ReportStatus;
import com.businessexchange.report.entity.ReportTargetType;
import com.businessexchange.report.repository.ReportRepository;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final BusinessRepository businessRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @Transactional
    public ReportBuyerResponse createReport(String reporterEmail, ReportCreateRequest request) {
        User buyer = userRepository.findByEmail(reporterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer not found"));

        if (buyer.getRole() != UserRole.BUYER) {
            throw new AccessDeniedException("Only registered buyers can submit reports");
        }

        String targetTitle;
        if (request.getTargetType() == ReportTargetType.BUSINESS) {
            Business business = businessRepository.findById(request.getTargetId())
                    .orElseThrow(() -> new ResourceNotFoundException("Business listing not found with ID: " + request.getTargetId()));

            if (business.getSeller() != null && business.getSeller().getId().equals(buyer.getId())) {
                throw new IllegalArgumentException("You cannot submit a report on your own business listing");
            }
            targetTitle = business.getTitle();
        } else if (request.getTargetType() == ReportTargetType.SELLER) {
            User sellerUser = userRepository.findById(request.getTargetId())
                    .orElseThrow(() -> new ResourceNotFoundException("Seller user not found with ID: " + request.getTargetId()));

            if (sellerUser.getRole() != UserRole.SELLER) {
                throw new IllegalArgumentException("Target user with ID " + request.getTargetId() + " is not a registered seller");
            }

            if (sellerUser.getId().equals(buyer.getId())) {
                throw new IllegalArgumentException("You cannot report yourself");
            }
            targetTitle = sellerUser.getFullName() != null ? sellerUser.getFullName() : sellerUser.getEmail();
        } else {
            throw new IllegalArgumentException("Unsupported report target type: " + request.getTargetType());
        }

        // Check for duplicate OPEN or UNDER_REVIEW report by the same buyer for the same target
        boolean duplicateExists = reportRepository.existsByReporterIdAndTargetTypeAndTargetIdAndStatusIn(
                buyer.getId(),
                request.getTargetType(),
                request.getTargetId(),
                List.of(ReportStatus.OPEN, ReportStatus.UNDER_REVIEW)
        );

        if (duplicateExists) {
            throw new DuplicateResourceException(
                    "You already have an active report for this " + request.getTargetType().name().toLowerCase() +
                            " that is currently open or under review. Please wait for an administrator to review it."
            );
        }

        Report report = Report.builder()
                .reporter(buyer)
                .targetType(request.getTargetType())
                .targetId(request.getTargetId())
                .category(request.getCategory())
                .description(request.getDescription().trim())
                .status(ReportStatus.OPEN)
                .build();

        Report savedReport = reportRepository.save(report);

        // Record audit event with the acting buyer
        auditService.record(
                buyer,
                "REPORT_SUBMITTED",
                "REPORT",
                savedReport.getId(),
                "Buyer submitted report for " + request.getTargetType() + " " + request.getTargetId() + " (" + request.getCategory() + ")"
        );

        // Notify admins of new submission
        List<User> admins = userRepository.findByRole(UserRole.ADMIN);
        for (User admin : admins) {
            notificationService.notify(
                    admin,
                    "New Buyer Report Submitted",
                    "A buyer reported " + request.getTargetType() + " '" + targetTitle + "' (" + request.getCategory() + ")",
                    "/admin/reports"
            );
        }

        return mapToBuyerResponse(savedReport, targetTitle);
    }

    @Transactional(readOnly = true)
    public List<ReportBuyerResponse> getMyReports(String buyerEmail) {
        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer not found"));

        return reportRepository.findByReporterIdOrderByCreatedAtDesc(buyer.getId())
                .stream()
                .map(this::mapToBuyerResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Object getReportById(Long id, String userEmail) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with ID: " + id));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() == UserRole.ADMIN) {
            return mapToAdminResponse(report);
        }

        if (user.getRole() == UserRole.BUYER && report.getReporter().getId().equals(user.getId())) {
            return mapToBuyerResponse(report);
        }

        // Do not expose report contents or reporter identity to sellers or unauthorized users
        throw new AccessDeniedException("You are not authorized to view this report");
    }

    @Transactional(readOnly = true)
    public List<ReportAdminResponse> getAllReportsAdmin(ReportStatus status, ReportTargetType targetType) {
        List<Report> reports;
        if (status != null && targetType != null) {
            reports = reportRepository.findByStatusAndTargetTypeOrderByCreatedAtDesc(status, targetType);
        } else if (status != null) {
            reports = reportRepository.findByStatusOrderByCreatedAtDesc(status);
        } else if (targetType != null) {
            reports = reportRepository.findByTargetTypeOrderByCreatedAtDesc(targetType);
        } else {
            reports = reportRepository.findAllByOrderByCreatedAtDesc();
        }

        return reports.stream()
                .map(this::mapToAdminResponse)
                .toList();
    }

    @Transactional
    public ReportAdminResponse updateReportStatus(Long id, String adminEmail, ReportStatusUpdateRequest request) {
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));

        if (admin.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only administrators can update report statuses");
        }

        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with ID: " + id));

        ReportStatus newStatus = request.getStatus();

        // Require resolution explanation when marking as RESOLVED or DISMISSED
        if ((newStatus == ReportStatus.RESOLVED || newStatus == ReportStatus.DISMISSED)) {
            if (request.getResolutionNotes() == null || request.getResolutionNotes().trim().isEmpty()) {
                throw new IllegalArgumentException("A resolution explanation is required when setting report status to " + newStatus);
            }
        }

        report.setStatus(newStatus);
        if (request.getResolutionNotes() != null) {
            report.setResolutionNotes(request.getResolutionNotes().trim());
        }
        if (request.getAdminInternalNotes() != null) {
            report.setAdminInternalNotes(request.getAdminInternalNotes().trim());
        }

        if (newStatus == ReportStatus.RESOLVED || newStatus == ReportStatus.DISMISSED) {
            report.setResolvedBy(admin);
            report.setResolvedAt(LocalDateTime.now());
        }

        Report savedReport = reportRepository.save(report);

        // Record audit event with the acting admin
        auditService.record(
                admin,
                "REPORT_STATUS_UPDATED",
                "REPORT",
                savedReport.getId(),
                "Admin updated report status to " + newStatus
        );

        // Notify the buyer of the relevant status change
        String targetTitle = resolveTargetTitle(savedReport.getTargetType(), savedReport.getTargetId());
        String notificationMessage = "Your report for " + savedReport.getTargetType() + " '" + targetTitle + "' has been marked as " + newStatus;
        if (savedReport.getResolutionNotes() != null && !savedReport.getResolutionNotes().isEmpty()) {
            notificationMessage += ". Explanation: " + savedReport.getResolutionNotes();
        }

        notificationService.notify(
                savedReport.getReporter(),
                "Report Status Update: " + newStatus,
                notificationMessage,
                "/buyer/reports"
        );

        return mapToAdminResponse(savedReport);
    }

    private String resolveTargetTitle(ReportTargetType targetType, Long targetId) {
        try {
            if (targetType == ReportTargetType.BUSINESS) {
                return businessRepository.findById(targetId)
                        .map(Business::getTitle)
                        .orElse("Listing #" + targetId);
            } else if (targetType == ReportTargetType.SELLER) {
                return userRepository.findById(targetId)
                        .map(u -> u.getFullName() != null ? u.getFullName() : u.getEmail())
                        .orElse("Seller #" + targetId);
            }
        } catch (Exception ignored) {
        }
        return targetType + " #" + targetId;
    }

    private String resolveTargetOwnerOrSellerEmail(ReportTargetType targetType, Long targetId) {
        try {
            if (targetType == ReportTargetType.BUSINESS) {
                return businessRepository.findById(targetId)
                        .map(b -> b.getSeller() != null ? b.getSeller().getEmail() : "N/A")
                        .orElse("N/A");
            } else if (targetType == ReportTargetType.SELLER) {
                return userRepository.findById(targetId)
                        .map(User::getEmail)
                        .orElse("N/A");
            }
        } catch (Exception ignored) {
        }
        return "N/A";
    }

    private ReportBuyerResponse mapToBuyerResponse(Report report) {
        String targetTitle = resolveTargetTitle(report.getTargetType(), report.getTargetId());
        return mapToBuyerResponse(report, targetTitle);
    }

    private ReportBuyerResponse mapToBuyerResponse(Report report, String targetTitle) {
        return ReportBuyerResponse.builder()
                .id(report.getId())
                .targetType(report.getTargetType())
                .targetId(report.getTargetId())
                .targetTitle(targetTitle)
                .category(report.getCategory())
                .description(report.getDescription())
                .status(report.getStatus())
                .resolutionNotes(report.getResolutionNotes())
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .resolvedAt(report.getResolvedAt())
                .build();
    }

    private ReportAdminResponse mapToAdminResponse(Report report) {
        String targetTitle = resolveTargetTitle(report.getTargetType(), report.getTargetId());
        String ownerEmail = resolveTargetOwnerOrSellerEmail(report.getTargetType(), report.getTargetId());

        return ReportAdminResponse.builder()
                .id(report.getId())
                .reporterId(report.getReporter().getId())
                .reporterName(report.getReporter().getFullName())
                .reporterEmail(report.getReporter().getEmail())
                .targetType(report.getTargetType())
                .targetId(report.getTargetId())
                .targetTitle(targetTitle)
                .targetOwnerOrSellerEmail(ownerEmail)
                .category(report.getCategory())
                .description(report.getDescription())
                .status(report.getStatus())
                .resolutionNotes(report.getResolutionNotes())
                .adminInternalNotes(report.getAdminInternalNotes())
                .resolvedByAdminId(report.getResolvedBy() != null ? report.getResolvedBy().getId() : null)
                .resolvedByAdminName(report.getResolvedBy() != null ? report.getResolvedBy().getFullName() : null)
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .resolvedAt(report.getResolvedAt())
                .build();
    }
}
