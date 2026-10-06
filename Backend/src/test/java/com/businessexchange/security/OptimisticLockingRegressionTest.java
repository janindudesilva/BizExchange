package com.businessexchange.security;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessStatus;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.seller.entity.SellerProfile;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.support.entity.SupportTicket;
import com.businessexchange.support.entity.TicketStatus;
import com.businessexchange.support.repository.SupportTicketRepository;
import com.businessexchange.user.entity.User;
import jakarta.persistence.Version;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.OptimisticLockingFailureException;

import java.lang.reflect.Field;
import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OptimisticLockingRegressionTest {

    @Mock
    private BusinessRepository businessRepository;

    @Mock
    private SupportTicketRepository supportTicketRepository;

    @Test
    @DisplayName("CONCURRENCY: Business entity has @Version configured for optimistic concurrency control")
    void testBusinessHasVersionAnnotation() throws NoSuchFieldException {
        Field versionField = Business.class.getDeclaredField("version");
        assertNotNull(versionField, "Business must have a 'version' field");
        assertTrue(versionField.isAnnotationPresent(Version.class),
                "Business 'version' field must be annotated with @jakarta.persistence.Version");

        Business business = Business.builder()
                .id(100L)
                .title("Tech Startup")
                .askingPrice(BigDecimal.valueOf(250000))
                .status(BusinessStatus.PENDING_REVIEW)
                .version(1L)
                .build();

        assertEquals(1L, business.getVersion());
    }

    @Test
    @DisplayName("CONCURRENCY: SupportTicket entity has @Version configured to prevent race conditions on agent assignment")
    void testSupportTicketHasVersionAnnotation() throws NoSuchFieldException {
        Field versionField = SupportTicket.class.getDeclaredField("version");
        assertNotNull(versionField, "SupportTicket must have a 'version' field");
        assertTrue(versionField.isAnnotationPresent(Version.class),
                "SupportTicket 'version' field must be annotated with @jakarta.persistence.Version");

        SupportTicket ticket = SupportTicket.builder()
                .id(50L)
                .ticketNumber("TCK-12345678")
                .subject("Payment issue")
                .status(TicketStatus.OPEN)
                .version(2L)
                .build();

        assertEquals(2L, ticket.getVersion());
    }

    @Test
    @DisplayName("CONCURRENCY: SellerProfile entity has @Version configured to protect verification state transitions")
    void testSellerProfileHasVersionAnnotation() throws NoSuchFieldException {
        Field versionField = SellerProfile.class.getDeclaredField("version");
        assertNotNull(versionField, "SellerProfile must have a 'version' field");
        assertTrue(versionField.isAnnotationPresent(Version.class),
                "SellerProfile 'version' field must be annotated with @jakarta.persistence.Version");

        SellerProfile profile = SellerProfile.builder()
                .id(1L)
                .verificationStatus(VerificationStatus.PENDING)
                .version(1L)
                .build();

        assertEquals(1L, profile.getVersion());
    }

    @Test
    @DisplayName("CONCURRENCY: Stale update on Business triggers OptimisticLockingFailureException")
    void testConcurrentUpdateConflictOnBusiness() {
        Business staleBusiness = Business.builder()
                .id(100L)
                .title("Stale Listing Update")
                .version(1L)
                .build();

        // Simulate JPA/Hibernate throwing OptimisticLockingFailureException on version mismatch
        when(businessRepository.save(staleBusiness))
                .thenThrow(new OptimisticLockingFailureException("Row was updated or deleted by another transaction (or unsaved-value mapping was incorrect): [com.businessexchange.business.entity.Business#100]"));

        assertThrows(OptimisticLockingFailureException.class, () -> {
            businessRepository.save(staleBusiness);
        }, "Saving a business with a stale version must fail with OptimisticLockingFailureException");
    }

    @Test
    @DisplayName("CONCURRENCY: Two support agents simultaneously claiming same ticket triggers OptimisticLockingFailureException")
    void testConcurrentAgentClaimTicketConflict() {
        User agent1 = User.builder().id(201L).email("agent1@bizexchange.local").build();
        User agent2 = User.builder().id(202L).email("agent2@bizexchange.local").build();

        SupportTicket ticketAgent1 = SupportTicket.builder()
                .id(500L)
                .assignedTo(agent1)
                .version(1L)
                .build();

        SupportTicket ticketAgent2Stale = SupportTicket.builder()
                .id(500L)
                .assignedTo(agent2)
                .version(1L)
                .build();

        // Agent 1 succeeds
        when(supportTicketRepository.save(ticketAgent1)).thenReturn(ticketAgent1);
        SupportTicket savedTicket = supportTicketRepository.save(ticketAgent1);
        assertNotNull(savedTicket);

        // Agent 2 fails due to optimistic lock failure on stale version
        when(supportTicketRepository.save(ticketAgent2Stale))
                .thenThrow(new OptimisticLockingFailureException("Optimistic lock conflict: SupportTicket #500 was modified by another transaction"));

        assertThrows(OptimisticLockingFailureException.class, () -> {
            supportTicketRepository.save(ticketAgent2Stale);
        }, "Second simultaneous assignment to stale ticket must fail with OptimisticLockingFailureException");
    }
}
