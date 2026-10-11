package com.businessexchange.report;

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
import com.businessexchange.report.service.ReportService;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportServiceUnitTest {

    @Mock
    private ReportRepository reportRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private BusinessRepository businessRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private ReportService reportService;

    private User buyer;
    private User seller;
    private User admin;
    private Business business;

    @BeforeEach
    void setUp() {
        buyer = User.builder()
                .id(1L)
                .email("buyer@example.com")
                .fullName("Test Buyer")
                .role(UserRole.BUYER)
                .build();

        seller = User.builder()
                .id(2L)
                .email("seller@example.com")
                .fullName("Test Seller")
                .role(UserRole.SELLER)
                .build();

        admin = User.builder()
                .id(3L)
                .email("admin@example.com")
                .fullName("Test Admin")
                .role(UserRole.ADMIN)
                .build();

        business = Business.builder()
                .id(10L)
                .title("Acme Tech Solutions")
                .seller(seller)
                .build();
    }

    @Test
    @DisplayName("Buyer can report a business listing successfully")
    void testCreateReport_Business_Success() {
        ReportCreateRequest request = ReportCreateRequest.builder()
                .targetType(ReportTargetType.BUSINESS)
                .targetId(10L)
                .category(ReportCategory.SCAM_OR_FRAUD)
                .description("Suspicious financial statements provided in listing")
                .build();

        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        when(businessRepository.findById(10L)).thenReturn(Optional.of(business));
        when(reportRepository.existsByReporterIdAndTargetTypeAndTargetIdAndStatusIn(eq(1L), eq(ReportTargetType.BUSINESS), eq(10L), any()))
                .thenReturn(false);

        Report saved = Report.builder()
                .id(100L)
                .reporter(buyer)
                .targetType(ReportTargetType.BUSINESS)
                .targetId(10L)
                .category(ReportCategory.SCAM_OR_FRAUD)
                .description(request.getDescription())
                .status(ReportStatus.OPEN)
                .createdAt(LocalDateTime.now())
                .build();

        when(reportRepository.save(any(Report.class))).thenReturn(saved);
        when(userRepository.findByRole(UserRole.ADMIN)).thenReturn(List.of(admin));

        ReportBuyerResponse response = reportService.createReport("buyer@example.com", request);

        assertNotNull(response);
        assertEquals(100L, response.getId());
        assertEquals(ReportTargetType.BUSINESS, response.getTargetType());
        assertEquals(10L, response.getTargetId());
        assertEquals("Acme Tech Solutions", response.getTargetTitle());
        assertEquals(ReportStatus.OPEN, response.getStatus());

        // Verify audit log recorded with acting buyer
        verify(auditService).record(eq(buyer), eq("REPORT_SUBMITTED"), eq("REPORT"), eq(100L), anyString());

        // Verify admin notified
        verify(notificationService).notify(eq(admin), eq("New Buyer Report Submitted"), anyString(), eq("/admin/reports"));
    }

    @Test
    @DisplayName("Buyer can report a seller successfully")
    void testCreateReport_Seller_Success() {
        ReportCreateRequest request = ReportCreateRequest.builder()
                .targetType(ReportTargetType.SELLER)
                .targetId(2L)
                .category(ReportCategory.SUSPICIOUS_DOCUMENTS)
                .description("Forged tax certificates provided during due diligence")
                .build();

        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        when(userRepository.findById(2L)).thenReturn(Optional.of(seller));
        when(reportRepository.existsByReporterIdAndTargetTypeAndTargetIdAndStatusIn(eq(1L), eq(ReportTargetType.SELLER), eq(2L), any()))
                .thenReturn(false);

        Report saved = Report.builder()
                .id(101L)
                .reporter(buyer)
                .targetType(ReportTargetType.SELLER)
                .targetId(2L)
                .category(request.getCategory())
                .description(request.getDescription())
                .status(ReportStatus.OPEN)
                .createdAt(LocalDateTime.now())
                .build();

        when(reportRepository.save(any(Report.class))).thenReturn(saved);
        when(userRepository.findByRole(UserRole.ADMIN)).thenReturn(List.of(admin));

        ReportBuyerResponse response = reportService.createReport("buyer@example.com", request);

        assertNotNull(response);
        assertEquals(ReportTargetType.SELLER, response.getTargetType());
        assertEquals(2L, response.getTargetId());
        assertEquals("Test Seller", response.getTargetTitle());
    }

    @Test
    @DisplayName("Prevent duplicate active reports from same buyer on same target")
    void testCreateReport_DuplicateActiveReport_ThrowsException() {
        ReportCreateRequest request = ReportCreateRequest.builder()
                .targetType(ReportTargetType.BUSINESS)
                .targetId(10L)
                .category(ReportCategory.MISLEADING_INFORMATION)
                .description("Misrepresented revenue figures")
                .build();

        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        when(businessRepository.findById(10L)).thenReturn(Optional.of(business));
        when(reportRepository.existsByReporterIdAndTargetTypeAndTargetIdAndStatusIn(eq(1L), eq(ReportTargetType.BUSINESS), eq(10L), any()))
                .thenReturn(true);

        assertThrows(DuplicateResourceException.class, () ->
                reportService.createReport("buyer@example.com", request));

        verify(reportRepository, never()).save(any());
    }

    @Test
    @DisplayName("Buyer cannot report own business listing")
    void testCreateReport_OwnBusiness_ThrowsException() {
        business.setSeller(buyer); // buyer owns listing

        ReportCreateRequest request = ReportCreateRequest.builder()
                .targetType(ReportTargetType.BUSINESS)
                .targetId(10L)
                .category(ReportCategory.OTHER)
                .description("Self reporting test description")
                .build();

        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        when(businessRepository.findById(10L)).thenReturn(Optional.of(business));

        assertThrows(IllegalArgumentException.class, () ->
                reportService.createReport("buyer@example.com", request));
    }

    @Test
    @DisplayName("Buyer cannot report non-seller user")
    void testCreateReport_TargetNotSeller_ThrowsException() {
        User anotherBuyer = User.builder()
                .id(4L)
                .email("another@example.com")
                .role(UserRole.BUYER)
                .build();

        ReportCreateRequest request = ReportCreateRequest.builder()
                .targetType(ReportTargetType.SELLER)
                .targetId(4L)
                .category(ReportCategory.SCAM_OR_FRAUD)
                .description("Trying to report another buyer")
                .build();

        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        when(userRepository.findById(4L)).thenReturn(Optional.of(anotherBuyer));

        assertThrows(IllegalArgumentException.class, () ->
                reportService.createReport("buyer@example.com", request));
    }

    @Test
    @DisplayName("Non-buyer cannot create report")
    void testCreateReport_NonBuyer_ThrowsAccessDenied() {
        ReportCreateRequest request = ReportCreateRequest.builder()
                .targetType(ReportTargetType.BUSINESS)
                .targetId(10L)
                .category(ReportCategory.OTHER)
                .description("Trying to report as seller")
                .build();

        when(userRepository.findByEmail("seller@example.com")).thenReturn(Optional.of(seller));

        assertThrows(AccessDeniedException.class, () ->
                reportService.createReport("seller@example.com", request));
    }

    @Test
    @DisplayName("Report details privacy: seller cannot view report")
    void testGetReportById_ReportedSellerCannotView() {
        Report report = Report.builder()
                .id(100L)
                .reporter(buyer)
                .targetType(ReportTargetType.SELLER)
                .targetId(2L)
                .category(ReportCategory.SCAM_OR_FRAUD)
                .description("Fraudulent documents")
                .status(ReportStatus.OPEN)
                .build();

        when(reportRepository.findById(100L)).thenReturn(Optional.of(report));
        when(userRepository.findByEmail("seller@example.com")).thenReturn(Optional.of(seller));

        assertThrows(AccessDeniedException.class, () ->
                reportService.getReportById(100L, "seller@example.com"));
    }

    @Test
    @DisplayName("Report details privacy: other buyer cannot view report")
    void testGetReportById_OtherBuyerCannotView() {
        User otherBuyer = User.builder()
                .id(99L)
                .email("otherbuyer@example.com")
                .role(UserRole.BUYER)
                .build();

        Report report = Report.builder()
                .id(100L)
                .reporter(buyer)
                .targetType(ReportTargetType.BUSINESS)
                .targetId(10L)
                .category(ReportCategory.SCAM_OR_FRAUD)
                .description("Fraudulent documents")
                .status(ReportStatus.OPEN)
                .build();

        when(reportRepository.findById(100L)).thenReturn(Optional.of(report));
        when(userRepository.findByEmail("otherbuyer@example.com")).thenReturn(Optional.of(otherBuyer));

        assertThrows(AccessDeniedException.class, () ->
                reportService.getReportById(100L, "otherbuyer@example.com"));
    }

    @Test
    @DisplayName("Buyer viewing own report does not see internal admin notes")
    void testGetReportById_BuyerDoesNotSeeInternalNotes() {
        Report report = Report.builder()
                .id(100L)
                .reporter(buyer)
                .targetType(ReportTargetType.BUSINESS)
                .targetId(10L)
                .category(ReportCategory.SCAM_OR_FRAUD)
                .description("Fraudulent documents")
                .status(ReportStatus.RESOLVED)
                .resolutionNotes("Listing verified and seller warned")
                .adminInternalNotes("CONFIDENTIAL: Legal team advised warning only")
                .build();

        when(reportRepository.findById(100L)).thenReturn(Optional.of(report));
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        when(businessRepository.findById(10L)).thenReturn(Optional.of(business));

        Object result = reportService.getReportById(100L, "buyer@example.com");

        assertTrue(result instanceof ReportBuyerResponse);
        ReportBuyerResponse buyerResponse = (ReportBuyerResponse) result;
        assertEquals("Listing verified and seller warned", buyerResponse.getResolutionNotes());
        // Ensure no internal notes in buyer response
    }

    @Test
    @DisplayName("Admin can view report with internal notes and reporter info")
    void testGetReportById_AdminSeesFullDetails() {
        Report report = Report.builder()
                .id(100L)
                .reporter(buyer)
                .targetType(ReportTargetType.BUSINESS)
                .targetId(10L)
                .category(ReportCategory.SCAM_OR_FRAUD)
                .description("Fraudulent documents")
                .status(ReportStatus.OPEN)
                .adminInternalNotes("Admin private notes")
                .build();

        when(reportRepository.findById(100L)).thenReturn(Optional.of(report));
        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(admin));
        when(businessRepository.findById(10L)).thenReturn(Optional.of(business));

        Object result = reportService.getReportById(100L, "admin@example.com");

        assertTrue(result instanceof ReportAdminResponse);
        ReportAdminResponse adminResponse = (ReportAdminResponse) result;
        assertEquals("Admin private notes", adminResponse.getAdminInternalNotes());
        assertEquals("buyer@example.com", adminResponse.getReporterEmail());
    }

    @Test
    @DisplayName("Admin updating status to RESOLVED requires resolution explanation")
    void testUpdateReportStatus_ResolvedWithoutExplanation_ThrowsException() {
        Report report = Report.builder()
                .id(100L)
                .reporter(buyer)
                .targetType(ReportTargetType.BUSINESS)
                .targetId(10L)
                .status(ReportStatus.OPEN)
                .build();

        ReportStatusUpdateRequest request = ReportStatusUpdateRequest.builder()
                .status(ReportStatus.RESOLVED)
                .resolutionNotes("   ") // blank
                .build();

        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(admin));
        when(reportRepository.findById(100L)).thenReturn(Optional.of(report));

        assertThrows(IllegalArgumentException.class, () ->
                reportService.updateReportStatus(100L, "admin@example.com", request));
    }

    @Test
    @DisplayName("Admin updating status to RESOLVED notifies buyer and logs audit")
    void testUpdateReportStatus_Resolved_Success() {
        Report report = Report.builder()
                .id(100L)
                .reporter(buyer)
                .targetType(ReportTargetType.BUSINESS)
                .targetId(10L)
                .status(ReportStatus.OPEN)
                .build();

        ReportStatusUpdateRequest request = ReportStatusUpdateRequest.builder()
                .status(ReportStatus.RESOLVED)
                .resolutionNotes("Investigation completed. Warning issued to seller.")
                .adminInternalNotes("Case 492 closed")
                .build();

        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(admin));
        when(reportRepository.findById(100L)).thenReturn(Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(i -> i.getArgument(0));
        when(businessRepository.findById(10L)).thenReturn(Optional.of(business));

        ReportAdminResponse response = reportService.updateReportStatus(100L, "admin@example.com", request);

        assertNotNull(response);
        assertEquals(ReportStatus.RESOLVED, response.getStatus());
        assertEquals("Investigation completed. Warning issued to seller.", response.getResolutionNotes());
        assertEquals("Case 492 closed", response.getAdminInternalNotes());

        // Verify audit log recorded
        verify(auditService).record(eq(admin), eq("REPORT_STATUS_UPDATED"), eq("REPORT"), eq(100L), anyString());

        // Verify buyer notified with explanation
        verify(notificationService).notify(eq(buyer), eq("Report Status Update: RESOLVED"), contains("Investigation completed"), eq("/buyer/reports"));
    }
}
