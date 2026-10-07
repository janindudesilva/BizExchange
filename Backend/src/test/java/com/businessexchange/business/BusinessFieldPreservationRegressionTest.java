package com.businessexchange.business;

import com.businessexchange.business.dto.BusinessResponse;
import com.businessexchange.business.dto.BusinessUpdateRequest;
import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessCategory;
import com.businessexchange.business.entity.BusinessStatus;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.business.service.BusinessService;
import com.businessexchange.common.audit.service.AuditService;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import com.businessexchange.verification.repository.VerificationRequestRepository;
import com.businessexchange.verification.service.VerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BusinessFieldPreservationRegressionTest {

    @Mock
    private BusinessRepository businessRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private VerificationService verificationService;

    @Mock
    private VerificationRequestRepository verificationRequestRepository;

    @Mock
    private AuditService auditService;

    @Mock
    private com.businessexchange.review.service.ReviewService reviewService;

    @Mock
    private com.businessexchange.review.repository.ReviewRepository reviewRepository;

    @Mock
    private com.businessexchange.favorite.service.SavedBusinessService savedBusinessService;

    @InjectMocks
    private BusinessService businessService;

    private User seller;
    private Business fullyPopulatedBusiness;

    @BeforeEach
    void setUp() {
        seller = new User();
        seller.setId(42L);
        seller.setEmail("seller@bizexchange.com");
        seller.setFullName("John Seller");
        seller.setRole(UserRole.SELLER);

        BusinessCategory category = BusinessCategory.builder()
                .id(1L)
                .name("Cleaning & Services")
                .build();

        fullyPopulatedBusiness = Business.builder()
                .id(10L)
                .seller(seller)
                .title("Original Cleaners")
                .description("Long standing family business")
                .category(category)
                .location("Colombo 03")
                .address("123 Galle Road, Kollupitiya, Colombo 03")
                .askingPrice(BigDecimal.valueOf(15000000))
                .businessAgeYears(12)
                .numberOfEmployees(8)
                .reasonForSelling("Retiring and moving overseas")
                .status(BusinessStatus.APPROVED)
                .verificationStatus(VerificationStatus.APPROVED)
                .build();
    }

    @Test
    @DisplayName("TASK 3: Changing only title and price preserves all other fields completely without data loss")
    void testPartialUpdatePreservesAllOtherFields() {
        when(businessRepository.findById(10L)).thenReturn(Optional.of(fullyPopulatedBusiness));
        when(businessRepository.save(any(Business.class))).thenAnswer(i -> i.getArgument(0));
        when(userRepository.findByEmail("seller@bizexchange.com")).thenReturn(Optional.of(seller));

        // Request changes ONLY title and price; all other fields are omitted/null
        BusinessUpdateRequest updateRequest = new BusinessUpdateRequest();
        updateRequest.setTitle("Updated Cleaners Colombo");
        updateRequest.setAskingPrice(BigDecimal.valueOf(18000000));

        BusinessResponse response = businessService.updateBusiness(10L, updateRequest, "seller@bizexchange.com");

        assertNotNull(response);
        assertEquals("Updated Cleaners Colombo", response.getTitle());
        assertEquals(BigDecimal.valueOf(18000000), response.getAskingPrice());

        // Verify that existing fields were NOT overwritten by null
        assertEquals("123 Galle Road, Kollupitiya, Colombo 03", fullyPopulatedBusiness.getAddress());
        assertEquals(12, fullyPopulatedBusiness.getBusinessAgeYears());
        assertEquals(8, fullyPopulatedBusiness.getNumberOfEmployees());
        assertEquals("Retiring and moving overseas", fullyPopulatedBusiness.getReasonForSelling());
        assertEquals("Long standing family business", fullyPopulatedBusiness.getDescription());
        assertEquals("Colombo 03", fullyPopulatedBusiness.getLocation());
        assertEquals("Cleaning & Services", fullyPopulatedBusiness.getCategory().getName());

        // TASK 7: Substantive edit on approved business triggers re-review state
        assertEquals(BusinessStatus.PENDING_REVIEW, fullyPopulatedBusiness.getStatus());
        assertEquals(VerificationStatus.PENDING, fullyPopulatedBusiness.getVerificationStatus());
        assertNull(fullyPopulatedBusiness.getRejectionReason());
    }

    @Test
    @DisplayName("TASK 3: Address privacy masking respects caller identity")
    void testAddressPrivacyMasking() {
        when(businessRepository.findById(10L)).thenReturn(Optional.of(fullyPopulatedBusiness));

        // When viewed by unauthorized party or public visitor (null user)
        BusinessResponse publicView = businessService.getBusinessById(10L, null);
        assertNull(publicView.getAddress(), "Public visitors should receive masked/null address");

        // When viewed by unrelated buyer
        User buyer = new User();
        buyer.setId(99L);
        buyer.setEmail("buyer@bizexchange.com");
        buyer.setRole(UserRole.BUYER);
        when(userRepository.findByEmail("buyer@bizexchange.com")).thenReturn(Optional.of(buyer));
        BusinessResponse buyerView = businessService.getBusinessById(10L, "buyer@bizexchange.com");
        assertNull(buyerView.getAddress(), "Unrelated buyers should not see confidential street address");

        // When viewed by listing owner
        when(userRepository.findByEmail("seller@bizexchange.com")).thenReturn(Optional.of(seller));
        BusinessResponse ownerView = businessService.getBusinessById(10L, "seller@bizexchange.com");
        assertEquals("123 Galle Road, Kollupitiya, Colombo 03", ownerView.getAddress(), "Owner should see complete address");
    }

    @Test
    @DisplayName("TASK 4: Intentionally clearing optional fields clears them to null without affecting required fields")
    void testIntentionallyClearOptionalFields() {
        when(businessRepository.findById(10L)).thenReturn(Optional.of(fullyPopulatedBusiness));
        when(businessRepository.save(any(Business.class))).thenAnswer(i -> i.getArgument(0));
        when(userRepository.findByEmail("seller@bizexchange.com")).thenReturn(Optional.of(seller));

        // Explicitly clear address (empty string), clear businessAgeYears (clear flag), clear numberOfEmployees (clear flag), clear reasonForSelling (empty string)
        BusinessUpdateRequest updateRequest = new BusinessUpdateRequest();
        updateRequest.setTitle("Still Operating Cleaners");
        updateRequest.setAddress(""); // intentional clear via empty string
        updateRequest.setClearBusinessAgeYears(true); // intentional clear via flag
        updateRequest.setClearNumberOfEmployees(true); // intentional clear via flag
        updateRequest.setReasonForSelling(""); // intentional clear via empty string

        businessService.updateBusiness(10L, updateRequest, "seller@bizexchange.com");

        // Verify optional fields were intentionally cleared
        assertNull(fullyPopulatedBusiness.getAddress(), "Address should be cleared to null");
        assertNull(fullyPopulatedBusiness.getBusinessAgeYears(), "BusinessAgeYears should be cleared to null");
        assertNull(fullyPopulatedBusiness.getNumberOfEmployees(), "NumberOfEmployees should be cleared to null");
        assertNull(fullyPopulatedBusiness.getReasonForSelling(), "ReasonForSelling should be cleared to null");

        // Verify required/omitted fields were retained
        assertEquals("Still Operating Cleaners", fullyPopulatedBusiness.getTitle());
        assertEquals("Long standing family business", fullyPopulatedBusiness.getDescription());
        assertEquals("Colombo 03", fullyPopulatedBusiness.getLocation());
        assertEquals(BigDecimal.valueOf(15000000), fullyPopulatedBusiness.getAskingPrice());
    }

    @Test
    @DisplayName("TASK 4: Explicit null in presentFields clears optional integer and string fields")
    void testPresentFieldsExplicitNullClearing() {
        when(businessRepository.findById(10L)).thenReturn(Optional.of(fullyPopulatedBusiness));
        when(businessRepository.save(any(Business.class))).thenAnswer(i -> i.getArgument(0));
        when(userRepository.findByEmail("seller@bizexchange.com")).thenReturn(Optional.of(seller));

        BusinessUpdateRequest updateRequest = new BusinessUpdateRequest();
        updateRequest.setBusinessAgeYears(null); // setter records "businessAgeYears" in presentFields
        updateRequest.setNumberOfEmployees(null); // setter records "numberOfEmployees" in presentFields
        updateRequest.setAddress(null); // setter records "address" in presentFields

        businessService.updateBusiness(10L, updateRequest, "seller@bizexchange.com");

        assertNull(fullyPopulatedBusiness.getBusinessAgeYears(), "businessAgeYears should be cleared when present as null");
        assertNull(fullyPopulatedBusiness.getNumberOfEmployees(), "numberOfEmployees should be cleared when present as null");
        assertNull(fullyPopulatedBusiness.getAddress(), "address should be cleared when present as null");
        // reasonForSelling was NOT in presentFields, so it must be preserved!
        assertEquals("Retiring and moving overseas", fullyPopulatedBusiness.getReasonForSelling(), "Omitted field must be preserved");
    }
}
