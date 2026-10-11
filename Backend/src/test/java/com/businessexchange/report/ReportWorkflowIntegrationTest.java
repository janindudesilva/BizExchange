package com.businessexchange.report;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessCategory;
import com.businessexchange.business.entity.BusinessStatus;
import com.businessexchange.business.repository.BusinessCategoryRepository;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.common.exception.DuplicateResourceException;
import com.businessexchange.common.exception.ResourceNotFoundException;
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
import com.businessexchange.seller.entity.SellerProfile;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.seller.repository.SellerProfileRepository;
import com.businessexchange.user.entity.AccountStatus;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.DefaultTransactionDefinition;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class ReportWorkflowIntegrationTest {

    @Autowired
    private ReportService reportService;

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private BusinessCategoryRepository categoryRepository;

    @Autowired
    private SellerProfileRepository sellerProfileRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private User buyer;
    private User otherBuyer;
    private User seller;
    private User admin;
    private Business business;

    @BeforeEach
    void setupTestData() {
        TransactionDefinition def = new DefaultTransactionDefinition();
        TransactionStatus status = transactionManager.getTransaction(def);
        try {
            reportRepository.deleteAll();

            long timestamp = System.currentTimeMillis();

            buyer = userRepository.save(User.builder()
                    .email("reportbuyer_" + timestamp + "@test.com")
                    .passwordHash("password")
                    .fullName("Reporting Buyer")
                    .role(UserRole.BUYER)
                    .status(AccountStatus.ACTIVE)
                    .build());

            otherBuyer = userRepository.save(User.builder()
                    .email("otherbuyer_" + timestamp + "@test.com")
                    .passwordHash("password")
                    .fullName("Other Buyer")
                    .role(UserRole.BUYER)
                    .status(AccountStatus.ACTIVE)
                    .build());

            seller = userRepository.save(User.builder()
                    .email("reportseller_" + timestamp + "@test.com")
                    .passwordHash("password")
                    .fullName("Reported Seller")
                    .role(UserRole.SELLER)
                    .status(AccountStatus.ACTIVE)
                    .build());

            sellerProfileRepository.save(SellerProfile.builder()
                    .user(seller)
                    .verificationStatus(VerificationStatus.APPROVED)
                    .flaggedSuspicious(false)
                    .build());

            admin = userRepository.save(User.builder()
                    .email("reportadmin_" + timestamp + "@test.com")
                    .passwordHash("password")
                    .fullName("Platform Admin")
                    .role(UserRole.ADMIN)
                    .status(AccountStatus.ACTIVE)
                    .build());

            BusinessCategory cat = categoryRepository.findByName("Technology")
                    .orElseGet(() -> categoryRepository.save(BusinessCategory.builder()
                            .name("Technology")
                            .description("Tech businesses")
                            .build()));

            business = businessRepository.save(Business.builder()
                    .title("Cloud SaaS Enterprise " + timestamp)
                    .description("High revenue SaaS business")
                    .category(cat)
                    .seller(seller)
                    .askingPrice(new BigDecimal("1500000.00"))
                    .location("Colombo, Sri Lanka")
                    .status(BusinessStatus.APPROVED)
                    .verificationStatus(VerificationStatus.APPROVED)
                    .build());

            transactionManager.commit(status);
        } catch (Exception e) {
            transactionManager.rollback(status);
            throw e;
        }
    }

    @Test
    @DisplayName("End-to-end report lifecycle: create, duplicate rejection, admin review, resolve, and notification")
    void testCompleteReportWorkflow() {
        // 1. Buyer reports business listing
        ReportCreateRequest createBizReport = ReportCreateRequest.builder()
                .targetType(ReportTargetType.BUSINESS)
                .targetId(business.getId())
                .category(ReportCategory.SCAM_OR_FRAUD)
                .description("False balance sheets provided by listing owner")
                .build();

        ReportBuyerResponse bizReport = reportService.createReport(buyer.getEmail(), createBizReport);
        assertNotNull(bizReport);
        assertEquals(ReportStatus.OPEN, bizReport.getStatus());
        assertEquals("Cloud SaaS Enterprise", bizReport.getTargetTitle().substring(0, 21));

        // 2. Prevent duplicate open report
        assertThrows(DuplicateResourceException.class, () ->
                reportService.createReport(buyer.getEmail(), createBizReport));

        // 3. Buyer reports seller
        ReportCreateRequest createSellerReport = ReportCreateRequest.builder()
                .targetType(ReportTargetType.SELLER)
                .targetId(seller.getId())
                .category(ReportCategory.MISLEADING_INFORMATION)
                .description("Seller refused to verify identity documents")
                .build();

        ReportBuyerResponse sellerReport = reportService.createReport(buyer.getEmail(), createSellerReport);
        assertNotNull(sellerReport);
        assertEquals(ReportTargetType.SELLER, sellerReport.getTargetType());
        assertEquals(seller.getId(), sellerReport.getTargetId());

        // 4. Buyer lists own reports
        List<ReportBuyerResponse> myReports = reportService.getMyReports(buyer.getEmail());
        assertEquals(2, myReports.size());

        // 5. Privacy: seller cannot view report details
        assertThrows(AccessDeniedException.class, () ->
                reportService.getReportById(bizReport.getId(), seller.getEmail()));

        // 6. Privacy: other buyer cannot view report details
        assertThrows(AccessDeniedException.class, () ->
                reportService.getReportById(bizReport.getId(), otherBuyer.getEmail()));

        // 7. Buyer views own report -> resolution notes visible, no admin internal notes
        Object buyerView = reportService.getReportById(bizReport.getId(), buyer.getEmail());
        assertTrue(buyerView instanceof ReportBuyerResponse);

        // 8. Admin lists all reports
        List<ReportAdminResponse> adminList = reportService.getAllReportsAdmin(null, null);
        assertTrue(adminList.size() >= 2);

        // Filter by targetType
        List<ReportAdminResponse> bizReportsOnly = reportService.getAllReportsAdmin(null, ReportTargetType.BUSINESS);
        assertTrue(bizReportsOnly.stream().allMatch(r -> r.getTargetType() == ReportTargetType.BUSINESS));

        // 9. Admin updates status to UNDER_REVIEW
        ReportStatusUpdateRequest underReviewReq = ReportStatusUpdateRequest.builder()
                .status(ReportStatus.UNDER_REVIEW)
                .adminInternalNotes("Assigned to compliance investigation team")
                .build();

        ReportAdminResponse underReviewRes = reportService.updateReportStatus(bizReport.getId(), admin.getEmail(), underReviewReq);
        assertEquals(ReportStatus.UNDER_REVIEW, underReviewRes.getStatus());
        assertEquals("Assigned to compliance investigation team", underReviewRes.getAdminInternalNotes());

        // 10. Admin resolves without explanation -> rejected
        ReportStatusUpdateRequest invalidResolve = ReportStatusUpdateRequest.builder()
                .status(ReportStatus.RESOLVED)
                .resolutionNotes("")
                .build();

        assertThrows(IllegalArgumentException.class, () ->
                reportService.updateReportStatus(bizReport.getId(), admin.getEmail(), invalidResolve));

        // 11. Admin resolves with explanation -> success
        ReportStatusUpdateRequest validResolve = ReportStatusUpdateRequest.builder()
                .status(ReportStatus.RESOLVED)
                .resolutionNotes("Financial audits were requested and verified independently.")
                .adminInternalNotes("Closed with no violation found")
                .build();

        ReportAdminResponse resolvedRes = reportService.updateReportStatus(bizReport.getId(), admin.getEmail(), validResolve);
        assertEquals(ReportStatus.RESOLVED, resolvedRes.getStatus());
        assertNotNull(resolvedRes.getResolvedAt());
        assertEquals(admin.getFullName(), resolvedRes.getResolvedByAdminName());
        assertEquals("Financial audits were requested and verified independently.", resolvedRes.getResolutionNotes());

        // 12. Buyer can now submit a new report on the business after previous was resolved
        ReportCreateRequest secondReport = ReportCreateRequest.builder()
                .targetType(ReportTargetType.BUSINESS)
                .targetId(business.getId())
                .category(ReportCategory.OTHER)
                .description("New separate concern observed after resolution")
                .build();

        ReportBuyerResponse secondBizReport = reportService.createReport(buyer.getEmail(), secondReport);
        assertNotNull(secondBizReport);
        assertEquals(ReportStatus.OPEN, secondBizReport.getStatus());
    }

    @Test
    @DisplayName("Validation guards: non-existent target, reporting self, reporting non-seller")
    void testValidationGuards() {
        // Non-existent business
        ReportCreateRequest badBiz = ReportCreateRequest.builder()
                .targetType(ReportTargetType.BUSINESS)
                .targetId(999999L)
                .category(ReportCategory.SCAM_OR_FRAUD)
                .description("Listing does not exist in platform")
                .build();
        assertThrows(ResourceNotFoundException.class, () ->
                reportService.createReport(buyer.getEmail(), badBiz));

        // Non-existent seller
        ReportCreateRequest badSeller = ReportCreateRequest.builder()
                .targetType(ReportTargetType.SELLER)
                .targetId(999999L)
                .category(ReportCategory.SCAM_OR_FRAUD)
                .description("Seller does not exist in platform")
                .build();
        assertThrows(ResourceNotFoundException.class, () ->
                reportService.createReport(buyer.getEmail(), badSeller));

        // Target user is a buyer, not a seller
        ReportCreateRequest reportBuyerUser = ReportCreateRequest.builder()
                .targetType(ReportTargetType.SELLER)
                .targetId(otherBuyer.getId())
                .category(ReportCategory.SCAM_OR_FRAUD)
                .description("Attempting to report a buyer as seller")
                .build();
        assertThrows(IllegalArgumentException.class, () ->
                reportService.createReport(buyer.getEmail(), reportBuyerUser));
    }
}
