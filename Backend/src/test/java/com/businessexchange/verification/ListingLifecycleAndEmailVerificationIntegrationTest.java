package com.businessexchange.verification;

import com.businessexchange.auth.dto.LoginRequest;
import com.businessexchange.auth.dto.RegisterSellerRequest;
import com.businessexchange.auth.service.AuthService;
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
import com.businessexchange.common.test.TestMailbox;
import com.businessexchange.seller.entity.SellerProfile;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.seller.repository.SellerProfileRepository;
import com.businessexchange.user.entity.AccountStatus;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import com.businessexchange.verification.dto.VerificationRequestDto;
import com.businessexchange.verification.service.VerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@org.springframework.test.context.TestPropertySource(properties = {"app.test-mailbox.enabled=true"})
public class ListingLifecycleAndEmailVerificationIntegrationTest {

    @Autowired
    private AuthService authService;

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
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TestMailbox testMailbox;

    private User admin;
    private User officer;

    @BeforeEach
    void setUp() {
        testMailbox.clear();

        admin = userRepository.findByEmail("admin_test@lifecycle.local").orElseGet(() -> {
            User u = User.builder()
                    .fullName("Lifecycle Admin")
                    .email("admin_test@lifecycle.local")
                    .phone("0711111111")
                    .passwordHash(passwordEncoder.encode("Pass123!"))
                    .role(UserRole.ADMIN)
                    .status(AccountStatus.ACTIVE)
                    .emailVerified(true)
                    .build();
            return userRepository.save(u);
        });

        officer = userRepository.findByEmail("officer_test@lifecycle.local").orElseGet(() -> {
            User u = User.builder()
                    .fullName("Lifecycle Officer")
                    .email("officer_test@lifecycle.local")
                    .phone("0722222222")
                    .passwordHash(passwordEncoder.encode("Pass123!"))
                    .role(UserRole.VERIFICATION_OFFICER)
                    .status(AccountStatus.ACTIVE)
                    .emailVerified(true)
                    .build();
            return userRepository.save(u);
        });

        if (categoryRepository.findByName("Retail").isEmpty()) {
            categoryRepository.save(BusinessCategory.builder().name("Retail").build());
        }
    }

    @Test
    @DisplayName("Email Verification: unverified users cannot login or access protected resources until token verified via mailbox")
    void testEmailVerificationLifecycle() {
        long timestamp = System.currentTimeMillis();
        String email = "unverified_seller_" + timestamp + "@test.local";
        String password = "Password123!";

        RegisterSellerRequest req = new RegisterSellerRequest();
        req.setFullName("Unverified Seller");
        req.setEmail(email);
        req.setPassword(password);
        req.setPhone("0733333333");
        req.setNicOrPassport("199123456789");
        req.setAddress("Colombo 04");
        req.setBusinessOwnerType("Individual");

        var regResponse = authService.registerSeller(req);
        assertNotNull(regResponse);
        assertNull(regResponse.getToken(), "Registration must not return active token to unverified account");

        // 1. Attempt login before verification -> must throw DisabledException
        assertThrows(DisabledException.class, () -> {
            authService.login(new LoginRequest(email, password));
        }, "Unverified user login must be rejected");

        // 2. Reject invalid verification token
        assertThrows(ResourceNotFoundException.class, () -> {
            authService.verifyEmail("completely-invalid-token-xyz");
        });

        // 3. Retrieve real token from isolated TestMailbox
        TestMailbox.RecordedEmail recorded = testMailbox.getLatest(email);
        assertNotNull(recorded, "Test mailbox must record outgoing verification email");
        assertNotNull(recorded.tokenOrOtp(), "Recorded verification token must not be null");

        // 4. Verify email using the real token
        authService.verifyEmail(recorded.tokenOrOtp());

        // 5. Already-used token must be rejected
        assertThrows(IllegalStateException.class, () -> {
            authService.verifyEmail(recorded.tokenOrOtp());
        }, "Already-used verification token must be rejected");

        // 6. Login now succeeds
        var loginResponse = authService.login(new LoginRequest(email, password));
        assertNotNull(loginResponse);
        assertNotNull(loginResponse.getToken(), "Login must return JWT token after verification");
    }

    @Test
    @DisplayName("Verification & Publication Lifecycle: re-submission atomically revokes public visibility and resets approval metadata")
    void testVerificationAndPublicationLifecycleTransitions() {
        long timestamp = System.currentTimeMillis();
        String sellerEmail = "lifecycle_seller_" + timestamp + "@test.local";

        User seller = User.builder()
                .fullName("Verified Lifecycle Seller")
                .email(sellerEmail)
                .phone("0744444444")
                .passwordHash(passwordEncoder.encode("Pass123!"))
                .role(UserRole.SELLER)
                .status(AccountStatus.ACTIVE)
                .emailVerified(true)
                .build();
        seller = userRepository.save(seller);

        SellerProfile profile = SellerProfile.builder()
                .user(seller)
                .nicOrPassport("198900000000")
                .address("Colombo 07")
                .businessOwnerType("Sole Proprietor")
                .verificationStatus(VerificationStatus.APPROVED)
                .build();
        sellerProfileRepository.save(profile);

        // 1. Create new listing
        BusinessCreateRequest createReq = new BusinessCreateRequest();
        createReq.setSellerId(seller.getId());
        createReq.setCategory("Retail");
        createReq.setTitle("Boutique Store " + timestamp);
        createReq.setDescription("Profitable fashion boutique");
        createReq.setLocation("Colombo");
        createReq.setAddress("123 Boutique St");
        createReq.setAskingPrice(new BigDecimal("150000.00"));
        createReq.setBusinessAgeYears(5);
        createReq.setNumberOfEmployees(4);
        createReq.setReasonForSelling("Retiring");

        BusinessResponse created = businessService.createBusiness(createReq, sellerEmail);
        Long businessId = created.getId();

        // Must start in PENDING_REVIEW and PENDING
        Business business = businessRepository.findById(businessId).orElseThrow();
        assertEquals(BusinessStatus.PENDING_REVIEW, business.getStatus());
        assertEquals(VerificationStatus.PENDING, business.getVerificationStatus());
        assertNull(business.getApprovedAt());
        assertNull(business.getApprovedBy());

        // Must NOT be visible in public listings
        List<BusinessResponse> publicListings = businessService.getApprovedBusinesses();
        assertFalse(publicListings.stream().anyMatch(b -> b.getId().equals(businessId)),
                "Pending listing must not appear in public listings");

        // Public detail lookup by anonymous user must fail
        assertThrows(ResourceNotFoundException.class, () -> {
            businessService.getBusinessById(businessId, null);
        }, "Anonymous detail request must fail for unapproved listing");

        // 2. Verification Officer approves verification
        var vr = verificationService.getByBusinessId(businessId);
        assertNotNull(vr);
        verificationService.assignToOfficer(vr.getId(), officer.getId());
        VerificationRequestDto officerApproved = verificationService.approve(vr.getId(), officer.getId());
        assertEquals("APPROVED", officerApproved.getStatus());

        // Assert listing still NOT visible publicly (admin publication pending!)
        business = businessRepository.findById(businessId).orElseThrow();
        assertEquals(BusinessStatus.PENDING_REVIEW, business.getStatus(), "Status must remain PENDING_REVIEW before admin publication");
        assertEquals(VerificationStatus.APPROVED, business.getVerificationStatus());
        assertNull(business.getApprovedAt(), "ApprovedAt must be null before admin approval");

        assertFalse(businessService.getApprovedBusinesses().stream().anyMatch(b -> b.getId().equals(businessId)),
                "Officer-approved listing must remain hidden from public until admin publication approval");

        // Appears in Admin publication pending queue
        List<BusinessResponse> adminPending = adminBusinessService.getPendingBusinesses();
        assertTrue(adminPending.stream().anyMatch(b -> b.getId().equals(businessId)),
                "Officer-approved listing must appear in admin pending publication queue");

        // 3. Admin approves publication
        BusinessResponse adminApproved = adminBusinessService.approveBusiness(businessId, admin.getEmail());
        assertEquals("APPROVED", adminApproved.getStatus());

        business = businessRepository.findById(businessId).orElseThrow();
        assertEquals(BusinessStatus.APPROVED, business.getStatus());
        assertEquals(VerificationStatus.APPROVED, business.getVerificationStatus());
        assertNotNull(business.getApprovedAt(), "ApprovedAt must be populated upon admin publication");
        assertNotNull(business.getApprovedBy(), "ApprovedBy must be populated upon admin publication");

        // NOW visible publicly!
        assertTrue(businessService.getApprovedBusinesses().stream().anyMatch(b -> b.getId().equals(businessId)),
                "Published listing must now be visible in public listings");
        assertDoesNotThrow(() -> businessService.getBusinessById(businessId, null),
                "Anonymous detail request must succeed for published listing");

        // 4. Owner re-submits listing for verification (e.g. after changes)
        verificationService.submitForVerification(businessId, seller.getId());

        // MUST immediately and atomically revoke public visibility!
        business = businessRepository.findById(businessId).orElseThrow();
        assertEquals(BusinessStatus.PENDING_REVIEW, business.getStatus(), "Resubmitted listing status must reset to PENDING_REVIEW");
        assertEquals(VerificationStatus.PENDING, business.getVerificationStatus(), "VerificationStatus must reset to PENDING");
        assertNull(business.getApprovedAt(), "ApprovedAt must be cleared on re-submission");
        assertNull(business.getApprovedBy(), "ApprovedBy must be cleared on re-submission");

        // Immediately hidden from public listings and detail
        assertFalse(businessService.getApprovedBusinesses().stream().anyMatch(b -> b.getId().equals(businessId)),
                "Resubmitted listing must be immediately hidden from public marketplace");
        assertThrows(ResourceNotFoundException.class, () -> {
            businessService.getBusinessById(businessId, null);
        }, "Anonymous detail request must fail after re-submission");

        // 5. Must not appear in admin pending publication queue until officer approves again
        adminPending = adminBusinessService.getPendingBusinesses();
        assertFalse(adminPending.stream().anyMatch(b -> b.getId().equals(businessId)),
                "Resubmitted listing must not appear in admin queue before officer re-approves");

        // 6. Officer re-approves
        vr = verificationService.getByBusinessId(businessId);
        verificationService.approve(vr.getId(), officer.getId());

        // Still hidden from public
        assertFalse(businessService.getApprovedBusinesses().stream().anyMatch(b -> b.getId().equals(businessId)),
                "Listing must remain hidden after officer re-approval until admin re-publishes");

        // Now appears in admin pending queue
        adminPending = adminBusinessService.getPendingBusinesses();
        assertTrue(adminPending.stream().anyMatch(b -> b.getId().equals(businessId)));

        // 7. Admin explicitly approves publication again
        adminBusinessService.approveBusiness(businessId, admin.getEmail());

        // Only then visible publicly again!
        assertTrue(businessService.getApprovedBusinesses().stream().anyMatch(b -> b.getId().equals(businessId)),
                "Listing must be visible again after admin re-approves publication");
    }
}
