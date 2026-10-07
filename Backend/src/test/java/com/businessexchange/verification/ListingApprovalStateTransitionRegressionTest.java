package com.businessexchange.verification;

import com.businessexchange.business.dto.BusinessCreateRequest;
import com.businessexchange.business.dto.BusinessResponse;
import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessCategory;
import com.businessexchange.business.entity.BusinessStatus;
import com.businessexchange.business.repository.BusinessCategoryRepository;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.business.service.AdminBusinessService;
import com.businessexchange.business.service.BusinessService;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.seller.entity.SellerProfile;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.seller.repository.SellerProfileRepository;
import com.businessexchange.user.entity.AccountStatus;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import com.businessexchange.verification.dto.VerificationRequestDto;
import com.businessexchange.verification.repository.VerificationRequestRepository;
import com.businessexchange.verification.service.VerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class ListingApprovalStateTransitionRegressionTest {

    @Autowired
    private BusinessService businessService;

    @Autowired
    private AdminBusinessService adminBusinessService;

    @Autowired
    private VerificationService verificationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SellerProfileRepository sellerProfileRepository;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private BusinessCategoryRepository categoryRepository;

    @Autowired
    private VerificationRequestRepository verificationRequestRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User admin;
    private User officer;
    private User seller;
    private User buyer;
    private BusinessCategory category;

    @BeforeEach
    void setUp() {
        String ts = String.valueOf(System.currentTimeMillis());

        category = categoryRepository.findByName("Retail")
                .orElseGet(() -> categoryRepository.save(BusinessCategory.builder().name("Retail").build()));

        admin = userRepository.save(User.builder()
                .fullName("Admin User")
                .email("admin_trans_" + ts + "@test.com")
                .passwordHash(passwordEncoder.encode("Password123!"))
                .role(UserRole.ADMIN)
                .status(AccountStatus.ACTIVE)
                .emailVerified(true)
                .build());

        officer = userRepository.save(User.builder()
                .fullName("Officer User")
                .email("officer_trans_" + ts + "@test.com")
                .passwordHash(passwordEncoder.encode("Password123!"))
                .role(UserRole.VERIFICATION_OFFICER)
                .status(AccountStatus.ACTIVE)
                .emailVerified(true)
                .build());

        seller = userRepository.save(User.builder()
                .fullName("Seller User")
                .email("seller_trans_" + ts + "@test.com")
                .passwordHash(passwordEncoder.encode("Password123!"))
                .role(UserRole.SELLER)
                .status(AccountStatus.ACTIVE)
                .emailVerified(true)
                .build());

        sellerProfileRepository.save(SellerProfile.builder()
                .user(seller)
                .verificationStatus(VerificationStatus.APPROVED)
                .nicOrPassport("NIC" + ts)
                .businessOwnerType("Sole Proprietorship")
                .build());

        buyer = userRepository.save(User.builder()
                .fullName("Unrelated Buyer")
                .email("buyer_trans_" + ts + "@test.com")
                .passwordHash(passwordEncoder.encode("Password123!"))
                .role(UserRole.BUYER)
                .status(AccountStatus.ACTIVE)
                .emailVerified(true)
                .build());
    }

    private BusinessCreateRequest buildCreateRequest(String title, BigDecimal price) {
        BusinessCreateRequest req = new BusinessCreateRequest();
        req.setTitle(title);
        req.setCategory("Retail");
        req.setDescription("Stable commercial operation");
        req.setLocation("Colombo");
        req.setAskingPrice(price);
        return req;
    }

    private Business createAndPublishBusiness(String titleSuffix) {
        BusinessCreateRequest createReq = buildCreateRequest("Transition Business " + titleSuffix, new BigDecimal("250000.00"));
        BusinessResponse created = businessService.createBusiness(createReq, seller.getEmail());
        Long bId = created.getId();

        VerificationRequestDto vReq = verificationService.getByBusinessId(bId);

        // Officer approves verification
        verificationService.approve(vReq.getId(), officer.getId());

        // Admin approves publication
        adminBusinessService.approveBusiness(bId, admin.getEmail());

        Business published = businessRepository.findById(bId).orElseThrow();
        assertEquals(BusinessStatus.APPROVED, published.getStatus());
        assertEquals(VerificationStatus.APPROVED, published.getVerificationStatus());
        assertNotNull(published.getApprovedBy());
        assertNotNull(published.getApprovedAt());

        // Verify publicly visible
        assertFalse(businessService.getApprovedBusinesses().stream().filter(b -> b.getId().equals(bId)).toList().isEmpty());
        assertNotNull(businessService.getBusinessById(bId, null));
        assertNotNull(businessService.getBusinessById(bId, buyer.getEmail()));

        return published;
    }

    @Test
    @DisplayName("Flow A: Published -> request more information -> officer approval -> fresh admin publication approval")
    void testFlowA_Published_RequestMoreInfo_OfficerApproval() {
        Business business = createAndPublishBusiness("FlowA");
        Long bId = business.getId();
        VerificationRequestDto vReq = verificationService.getByBusinessId(bId);

        // 1. Published listing legitimately enters re-review via officer request-more-info
        verificationService.requestMoreInfo(vReq.getId(), officer.getId(), "Need updated audited balance sheet");

        Business inReReview = businessRepository.findById(bId).orElseThrow();
        assertEquals(BusinessStatus.PENDING_REVIEW, inReReview.getStatus(), "Listing status must transition back to PENDING_REVIEW");
        assertEquals(VerificationStatus.NEEDS_MORE_INFORMATION, inReReview.getVerificationStatus());
        assertNull(inReReview.getApprovedBy(), "Publication approval metadata (approvedBy) must be cleared immediately");
        assertNull(inReReview.getApprovedAt(), "Publication approval metadata (approvedAt) must be cleared immediately");

        // Assert public listing and public detail access remain UNAVAILABLE
        assertTrue(businessService.getApprovedBusinesses().stream().filter(b -> b.getId().equals(bId)).toList().isEmpty(),
                "Listing must NOT appear in public approved businesses");
        assertThrows(ResourceNotFoundException.class, () -> businessService.getBusinessById(bId, null),
                "Anonymous public detail access must return 404");
        assertThrows(ResourceNotFoundException.class, () -> businessService.getBusinessById(bId, buyer.getEmail()),
                "Unrelated buyer detail access must return 404");

        // 2. Officer approves verification
        VerificationRequestDto approvedVReq = verificationService.approve(vReq.getId(), officer.getId());
        assertEquals("APPROVED", approvedVReq.getStatus());

        Business afterOfficerApprove = businessRepository.findById(bId).orElseThrow();
        assertEquals(VerificationStatus.APPROVED, afterOfficerApprove.getVerificationStatus());
        assertEquals(BusinessStatus.PENDING_REVIEW, afterOfficerApprove.getStatus(),
                "Officer approval must leave listing waiting for fresh admin publication approval (PENDING_REVIEW)");
        assertNull(afterOfficerApprove.getApprovedBy(), "Publication approvedBy must remain null until admin approval");
        assertNull(afterOfficerApprove.getApprovedAt(), "Publication approvedAt must remain null until admin approval");

        // Assert public listing and public detail access STILL remain UNAVAILABLE
        assertTrue(businessService.getApprovedBusinesses().stream().filter(b -> b.getId().equals(bId)).toList().isEmpty(),
                "Listing must NOT be public prior to admin approval");
        assertThrows(ResourceNotFoundException.class, () -> businessService.getBusinessById(bId, null),
                "Anonymous public detail access must remain 404 after officer approval");
        assertThrows(ResourceNotFoundException.class, () -> businessService.getBusinessById(bId, buyer.getEmail()),
                "Unrelated buyer access must remain 404 after officer approval");

        // 3. Administrator grants fresh publication approval
        adminBusinessService.approveBusiness(bId, admin.getEmail());

        Business liveAgain = businessRepository.findById(bId).orElseThrow();
        assertEquals(BusinessStatus.APPROVED, liveAgain.getStatus());
        assertEquals(VerificationStatus.APPROVED, liveAgain.getVerificationStatus());
        assertNotNull(liveAgain.getApprovedBy());
        assertNotNull(liveAgain.getApprovedAt());

        // Assert public listing and public detail access are now RESTORED
        assertFalse(businessService.getApprovedBusinesses().stream().filter(b -> b.getId().equals(bId)).toList().isEmpty(),
                "Listing must now appear in public approved businesses");
        assertNotNull(businessService.getBusinessById(bId, null));
        assertNotNull(businessService.getBusinessById(bId, buyer.getEmail()));
    }

    @Test
    @DisplayName("Flow B: Published -> officer rejection -> resubmission -> officer approval -> fresh admin approval")
    void testFlowB_Published_OfficerRejection_Resubmission_OfficerApproval() {
        Business business = createAndPublishBusiness("FlowB");
        Long bId = business.getId();
        VerificationRequestDto vReq = verificationService.getByBusinessId(bId);

        // 1. Officer rejects published listing
        verificationService.reject(vReq.getId(), officer.getId(), "Inconsistent registration documents");

        Business rejected = businessRepository.findById(bId).orElseThrow();
        assertEquals(BusinessStatus.REJECTED, rejected.getStatus());
        assertEquals(VerificationStatus.REJECTED, rejected.getVerificationStatus());
        assertNull(rejected.getApprovedBy());
        assertNull(rejected.getApprovedAt());

        // Assert public access unavailable
        assertTrue(businessService.getApprovedBusinesses().stream().filter(b -> b.getId().equals(bId)).toList().isEmpty());
        assertThrows(ResourceNotFoundException.class, () -> businessService.getBusinessById(bId, null));
        assertThrows(ResourceNotFoundException.class, () -> businessService.getBusinessById(bId, buyer.getEmail()));

        // Officer cannot approve a rejected request without resubmission
        assertThrows(IllegalStateException.class, () -> verificationService.approve(vReq.getId(), officer.getId()));

        // Admin cannot publish a rejected listing without re-verification
        assertThrows(IllegalStateException.class, () -> adminBusinessService.approveBusiness(bId, admin.getEmail()));

        // 2. Owner resubmits listing for verification
        verificationService.submitForVerification(bId, seller.getId());

        Business resubmitted = businessRepository.findById(bId).orElseThrow();
        assertEquals(BusinessStatus.PENDING_REVIEW, resubmitted.getStatus());
        assertEquals(VerificationStatus.PENDING, resubmitted.getVerificationStatus());

        // Assert public access still unavailable
        assertTrue(businessService.getApprovedBusinesses().stream().filter(b -> b.getId().equals(bId)).toList().isEmpty());
        assertThrows(ResourceNotFoundException.class, () -> businessService.getBusinessById(bId, null));

        // 3. Officer approves verification
        verificationService.approve(vReq.getId(), officer.getId());

        Business officerApproved = businessRepository.findById(bId).orElseThrow();
        assertEquals(VerificationStatus.APPROVED, officerApproved.getVerificationStatus());
        assertEquals(BusinessStatus.PENDING_REVIEW, officerApproved.getStatus(),
                "Listing must remain PENDING_REVIEW waiting for admin");

        // Public access STILL unavailable
        assertTrue(businessService.getApprovedBusinesses().stream().filter(b -> b.getId().equals(bId)).toList().isEmpty());
        assertThrows(ResourceNotFoundException.class, () -> businessService.getBusinessById(bId, null));

        // 4. Admin publishes listing
        adminBusinessService.approveBusiness(bId, admin.getEmail());

        Business live = businessRepository.findById(bId).orElseThrow();
        assertEquals(BusinessStatus.APPROVED, live.getStatus());
        assertEquals(VerificationStatus.APPROVED, live.getVerificationStatus());
        assertFalse(businessService.getApprovedBusinesses().stream().filter(b -> b.getId().equals(bId)).toList().isEmpty());
        assertNotNull(businessService.getBusinessById(bId, null));
    }

    @Test
    @DisplayName("Flow C: Normal owner resubmission workflow")
    void testFlowC_NormalOwnerResubmission() {
        BusinessCreateRequest createReq = buildCreateRequest("Owner Resubmission Business", new BigDecimal("150000.00"));

        BusinessResponse created = businessService.createBusiness(createReq, seller.getEmail());
        Long bId = created.getId();
        VerificationRequestDto vReq = verificationService.getByBusinessId(bId);

        // Initial state: PENDING / PENDING_REVIEW
        Business b1 = businessRepository.findById(bId).orElseThrow();
        assertEquals(BusinessStatus.PENDING_REVIEW, b1.getStatus());
        assertEquals(VerificationStatus.PENDING, b1.getVerificationStatus());

        // Officer requests more information
        verificationService.requestMoreInfo(vReq.getId(), officer.getId(), "Please upload business registration certificate");

        Business b2 = businessRepository.findById(bId).orElseThrow();
        assertEquals(VerificationStatus.NEEDS_MORE_INFORMATION, b2.getVerificationStatus());

        // Owner resubmits
        verificationService.submitForVerification(bId, seller.getId());

        Business b3 = businessRepository.findById(bId).orElseThrow();
        assertEquals(BusinessStatus.PENDING_REVIEW, b3.getStatus());
        assertEquals(VerificationStatus.PENDING, b3.getVerificationStatus());

        // Public access must remain unavailable
        assertTrue(businessService.getApprovedBusinesses().stream().filter(b -> b.getId().equals(bId)).toList().isEmpty());
        assertThrows(ResourceNotFoundException.class, () -> businessService.getBusinessById(bId, null));
    }

    @Test
    @DisplayName("Flow D: Repeated and stale officer and admin requests are rejected with clear errors, state preserved")
    void testFlowD_RepeatedAndStaleOfficerAndAdminRequests() {
        BusinessCreateRequest createReq = buildCreateRequest("Stale Request Test Business", new BigDecimal("180000.00"));

        BusinessResponse created = businessService.createBusiness(createReq, seller.getEmail());
        Long bId = created.getId();
        VerificationRequestDto vReq = verificationService.getByBusinessId(bId);

        // D1. Repeated submitForVerification while already PENDING
        IllegalStateException exD1 = assertThrows(IllegalStateException.class,
                () -> verificationService.submitForVerification(bId, seller.getId()),
                "Submitting while already pending review must be rejected");
        assertTrue(exD1.getMessage().contains("already pending review"));

        // D2. Admin approval without prior officer approval
        IllegalStateException exD2 = assertThrows(IllegalStateException.class,
                () -> adminBusinessService.approveBusiness(bId, admin.getEmail()),
                "Admin approval before officer approval must be rejected");
        assertTrue(exD2.getMessage().contains("prior verification officer approval"));

        // Officer approves verification
        verificationService.approve(vReq.getId(), officer.getId());

        // D3. Repeated officer approve while already APPROVED
        IllegalStateException exD3 = assertThrows(IllegalStateException.class,
                () -> verificationService.approve(vReq.getId(), officer.getId()),
                "Repeated officer approve must be rejected as stale");
        assertTrue(exD3.getMessage().contains("already approved"));

        // D4. Assigning an already approved request
        IllegalStateException exD4 = assertThrows(IllegalStateException.class,
                () -> verificationService.assignToOfficer(vReq.getId(), officer.getId()),
                "Assigning already decided request must be rejected");
        assertTrue(exD4.getMessage().contains("already been decided"));

        // Admin publishes listing
        adminBusinessService.approveBusiness(bId, admin.getEmail());

        // D5. Repeated admin approve while already published
        IllegalStateException exD5 = assertThrows(IllegalStateException.class,
                () -> adminBusinessService.approveBusiness(bId, admin.getEmail()),
                "Repeated admin approve must be rejected as stale");
        assertTrue(exD5.getMessage().contains("already approved and published"));

        // Admin rejects listing
        adminBusinessService.rejectBusiness(bId, admin.getEmail(), "Admin policy violation");

        // D6. Repeated admin reject while already rejected
        IllegalStateException exD6 = assertThrows(IllegalStateException.class,
                () -> adminBusinessService.rejectBusiness(bId, admin.getEmail(), "Admin policy violation again"),
                "Repeated admin reject must be rejected as stale");
        assertTrue(exD6.getMessage().contains("already rejected"));

        // D7. Officer approving an already rejected request without resubmission
        IllegalStateException exD7 = assertThrows(IllegalStateException.class,
                () -> verificationService.approve(vReq.getId(), officer.getId()),
                "Officer approving rejected request without resubmission must be rejected");
        assertTrue(exD7.getMessage().contains("without resubmission"));

        // D8. Officer request-more-info on rejected request
        IllegalStateException exD8 = assertThrows(IllegalStateException.class,
                () -> verificationService.requestMoreInfo(vReq.getId(), officer.getId(), "Some info"),
                "Requesting more info on rejected request must be rejected");
        assertTrue(exD8.getMessage().contains("Cannot request more information on a rejected"));

        // D9. Repeated officer reject when already rejected
        IllegalStateException exD9 = assertThrows(IllegalStateException.class,
                () -> verificationService.reject(vReq.getId(), officer.getId(), "Some reason"),
                "Repeated officer reject must be rejected as stale");
        assertTrue(exD9.getMessage().contains("already rejected"));

        // Verify listing state remained REJECTED and was not corrupted
        Business finalBusiness = businessRepository.findById(bId).orElseThrow();
        assertEquals(BusinessStatus.REJECTED, finalBusiness.getStatus());
        assertEquals(VerificationStatus.REJECTED, finalBusiness.getVerificationStatus());
    }
}
