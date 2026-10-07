package com.businessexchange.verification;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessStatus;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.common.audit.service.AuditService;
import com.businessexchange.notification.service.NotificationService;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import com.businessexchange.verification.dto.VerificationRequestDto;
import com.businessexchange.verification.entity.VerificationRequest;
import com.businessexchange.verification.repository.VerificationRequestRepository;
import com.businessexchange.verification.service.VerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VerificationSecurityRegressionTest {

    @Mock
    private VerificationRequestRepository verificationRequestRepository;

    @Mock
    private BusinessRepository businessRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private VerificationService verificationService;

    private User ownerSeller;
    private User otherSeller;
    private User adminUser;
    private Business testBusiness;

    @BeforeEach
    void setUp() {
        ownerSeller = new User();
        ownerSeller.setId(10L);
        ownerSeller.setEmail("owner@bizexchange.com");
        ownerSeller.setRole(UserRole.SELLER);

        otherSeller = new User();
        otherSeller.setId(20L);
        otherSeller.setEmail("intruder@bizexchange.com");
        otherSeller.setRole(UserRole.SELLER);

        adminUser = new User();
        adminUser.setId(1L);
        adminUser.setEmail("admin@bizexchange.com");
        adminUser.setRole(UserRole.ADMIN);

        testBusiness = Business.builder()
                .id(100L)
                .title("Eco Laundry")
                .seller(ownerSeller)
                .status(BusinessStatus.PENDING_REVIEW)
                .verificationStatus(VerificationStatus.PENDING)
                .build();
    }

    @Test
    @DisplayName("TASK 1: Listing owner is authorized to submit for verification")
    void testOwnerCanSubmitForVerification() {
        when(businessRepository.findById(100L)).thenReturn(Optional.of(testBusiness));
        when(userRepository.findById(10L)).thenReturn(Optional.of(ownerSeller));
        when(verificationRequestRepository.findByBusinessId(100L)).thenReturn(Optional.empty());
        when(verificationRequestRepository.save(any(VerificationRequest.class))).thenAnswer(invocation -> {
            VerificationRequest req = invocation.getArgument(0);
            req.setId(500L);
            return req;
        });

        VerificationRequestDto dto = verificationService.submitForVerification(100L, 10L);

        assertNotNull(dto);
        assertEquals("PENDING", dto.getStatus());
        verify(verificationRequestRepository).save(any(VerificationRequest.class));
    }

    @Test
    @DisplayName("TASK 1: Other seller is denied from submitting someone else's listing")
    void testOtherSellerDeniedFromSubmittingForVerification() {
        when(businessRepository.findById(100L)).thenReturn(Optional.of(testBusiness));
        when(userRepository.findById(20L)).thenReturn(Optional.of(otherSeller));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                verificationService.submitForVerification(100L, 20L)
        );

        assertTrue(ex.getMessage().contains("authorized") || ex.getMessage().contains("submit"));
        verify(verificationRequestRepository, never()).save(any());
    }

    @Test
    @DisplayName("TASK 1: Admin is authorized to submit listing for verification on behalf of seller")
    void testAdminCanSubmitForVerification() {
        when(businessRepository.findById(100L)).thenReturn(Optional.of(testBusiness));
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));
        when(verificationRequestRepository.findByBusinessId(100L)).thenReturn(Optional.empty());
        when(verificationRequestRepository.save(any(VerificationRequest.class))).thenAnswer(invocation -> {
            VerificationRequest req = invocation.getArgument(0);
            req.setId(501L);
            return req;
        });

        VerificationRequestDto dto = verificationService.submitForVerification(100L, 1L);

        assertNotNull(dto);
        assertEquals("PENDING", dto.getStatus());
        verify(verificationRequestRepository).save(any(VerificationRequest.class));
    }

    @Test
    @DisplayName("TASK 1: Unauthenticated (null) caller is rejected immediately")
    void testUnauthenticatedCallerRejected() {
        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                verificationService.submitForVerification(100L, null)
        );

        assertTrue(ex.getMessage().contains("Authentication required"));
        verify(businessRepository, never()).findById(any());
        verify(verificationRequestRepository, never()).save(any());
    }

    @Test
    @DisplayName("TASK 2: Request ID lookups and Business ID lookups have explicit, distinct contracts")
    void testExplicitIdentifierContracts() {
        VerificationRequest request = VerificationRequest.builder()
                .id(777L)
                .business(testBusiness)
                .status(VerificationStatus.PENDING)
                .build();

        when(verificationRequestRepository.findById(777L)).thenReturn(Optional.of(request));
        when(verificationRequestRepository.findByBusinessId(100L)).thenReturn(Optional.of(request));

        VerificationRequestDto byRequestId = verificationService.getById(777L);
        assertNotNull(byRequestId);
        assertEquals(777L, byRequestId.getId());

        VerificationRequestDto byBusinessId = verificationService.getByBusinessId(100L);
        assertNotNull(byBusinessId);
        assertEquals(777L, byBusinessId.getId());
        assertEquals(100L, byBusinessId.getBusinessId());

        verify(verificationRequestRepository).findById(777L);
        verify(verificationRequestRepository).findByBusinessId(100L);
    }
}
