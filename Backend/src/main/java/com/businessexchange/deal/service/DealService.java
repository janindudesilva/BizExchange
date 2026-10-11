package com.businessexchange.deal.service;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessStatus;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.common.audit.service.AuditService;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.deal.dto.*;
import com.businessexchange.deal.entity.Deal;
import com.businessexchange.deal.entity.DealStatus;
import com.businessexchange.deal.repository.DealRepository;
import com.businessexchange.notification.service.NotificationService;
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
public class DealService {

    public static final String COMPLETION_NOTICE =
            "Completion is based solely on mutual offline completion confirmation by both buyer and seller. " +
            "This does not represent verified platform payment processing.";

    private final DealRepository dealRepository;
    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public DealResponse getDealById(Long dealId, String requesterEmail) {
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Deal deal = dealRepository.findById(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal not found"));

        boolean isBuyer = deal.getBuyer().getId().equals(requester.getId());
        boolean isSeller = deal.getSeller().getId().equals(requester.getId());
        boolean isAdmin = requester.getRole() == UserRole.ADMIN;

        if (!isBuyer && !isSeller && !isAdmin) {
            throw new AccessDeniedException("You are not authorized to view this deal");
        }

        return mapToResponse(deal);
    }

    @Transactional(readOnly = true)
    public List<DealResponse> getMyDeals(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() == UserRole.BUYER) {
            return dealRepository.findByBuyerIdOrderByCreatedAtDesc(user.getId())
                    .stream()
                    .map(this::mapToResponse)
                    .toList();
        } else if (user.getRole() == UserRole.SELLER) {
            return dealRepository.findBySellerIdOrderByCreatedAtDesc(user.getId())
                    .stream()
                    .map(this::mapToResponse)
                    .toList();
        } else if (user.getRole() == UserRole.ADMIN) {
            return dealRepository.findAllByOrderByCreatedAtDesc()
                    .stream()
                    .map(this::mapToResponse)
                    .toList();
        } else {
            return List.of();
        }
    }

    @Transactional(readOnly = true)
    public List<DealResponse> getDealsByBusiness(Long businessId, String requesterEmail) {
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        boolean isSeller = business.getSeller().getId().equals(requester.getId());
        boolean isAdmin = requester.getRole() == UserRole.ADMIN;

        if (!isSeller && !isAdmin) {
            throw new AccessDeniedException("You are not authorized to view deals for this business");
        }

        return dealRepository.findByBusinessIdOrderByCreatedAtDesc(businessId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public DealResponse confirmCompletion(Long dealId, String requesterEmail) {
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Pessimistic lock to serialize concurrent confirmations safely
        Deal deal = dealRepository.findByIdForUpdate(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal not found"));

        boolean isBuyer = deal.getBuyer().getId().equals(requester.getId());
        boolean isSeller = deal.getSeller().getId().equals(requester.getId());

        if (!isBuyer && !isSeller) {
            throw new AccessDeniedException("Only the buyer or seller can confirm completion of this deal");
        }

        if (deal.getStatus() != DealStatus.IN_PROGRESS) {
            throw new IllegalStateException("Cannot confirm completion: deal is already " + deal.getStatus());
        }

        // Prevent completion while a cancellation request is pending
        if (deal.getCancellationRequestedAt() != null) {
            throw new IllegalStateException("Cannot confirm completion while a cancellation request is pending. Resolve the cancellation request first.");
        }

        boolean newlyConfirmed = false;
        if (isBuyer) {
            if (deal.getBuyerConfirmedAt() == null) {
                deal.setBuyerConfirmedAt(LocalDateTime.now());
                newlyConfirmed = true;
            }
        } else {
            if (deal.getSellerConfirmedAt() == null) {
                deal.setSellerConfirmedAt(LocalDateTime.now());
                newlyConfirmed = true;
            }
        }

        // Check if both parties have now confirmed offline completion
        boolean bothConfirmed = deal.getBuyerConfirmedAt() != null && deal.getSellerConfirmedAt() != null;

        if (bothConfirmed) {
            deal.setStatus(DealStatus.COMPLETED);
            deal.setClosedAt(LocalDateTime.now());

            // Mark business as SOLD
            Business business = deal.getBusiness();
            business.setStatus(BusinessStatus.SOLD);
            businessRepository.save(business);

            Deal saved = dealRepository.save(deal);

            auditService.record(requester, "DEAL_COMPLETED", "DEAL", saved.getId(),
                    "Deal completed upon mutual offline completion confirmation by buyer and seller. " + COMPLETION_NOTICE);

            notificationService.notify(deal.getBuyer(), "Deal Completed",
                    String.format("Both parties confirmed completion of the transaction outside the platform for %s.", business.getTitle()),
                    "/buyer/deals");

            notificationService.notify(deal.getSeller(), "Deal Completed",
                    String.format("Both parties confirmed completion of the transaction outside the platform for %s. Listing marked as SOLD.", business.getTitle()),
                    "/seller/deals");

            return mapToResponse(saved);
        } else {
            Deal saved = dealRepository.save(deal);

            if (newlyConfirmed) {
                auditService.record(requester, "DEAL_COMPLETION_CONFIRMED", "DEAL", saved.getId(),
                        String.format("%s confirmed offline completion. Waiting for counterparty confirmation.", requester.getFullName()));

                User counterparty = isBuyer ? deal.getSeller() : deal.getBuyer();
                notificationService.notify(counterparty, "Counterparty Confirmed Completion",
                        String.format("%s confirmed deal completion outside the platform for %s. Please confirm once your offline transition is complete.",
                                requester.getFullName(), deal.getBusiness().getTitle()),
                        isBuyer ? "/seller/deals" : "/buyer/deals");
            }

            return mapToResponse(saved);
        }
    }

    @Transactional
    public DealResponse requestCancellation(Long dealId, String requesterEmail, RequestCancellationRequest request) {
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Deal deal = dealRepository.findByIdForUpdate(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal not found"));

        boolean isBuyer = deal.getBuyer().getId().equals(requester.getId());
        boolean isSeller = deal.getSeller().getId().equals(requester.getId());

        if (!isBuyer && !isSeller) {
            throw new AccessDeniedException("Only the buyer or seller can request cancellation of this deal");
        }

        if (deal.getStatus() != DealStatus.IN_PROGRESS) {
            throw new IllegalStateException("Cannot request cancellation: deal is already " + deal.getStatus());
        }

        if (deal.getCancellationRequestedAt() != null) {
            throw new IllegalStateException("A cancellation request is already pending for this deal");
        }

        if (request == null || request.getReason() == null || request.getReason().trim().isEmpty()) {
            throw new IllegalArgumentException("Cancellation reason is required");
        }

        deal.setCancellationRequestedBy(requester);
        deal.setCancellationReason(request.getReason().trim());
        deal.setCancellationRequestedAt(LocalDateTime.now());

        Deal saved = dealRepository.save(deal);

        auditService.record(requester, "DEAL_CANCELLATION_REQUESTED", "DEAL", saved.getId(),
                String.format("Cancellation requested by %s. Reason: %s", requester.getFullName(), deal.getCancellationReason()));

        User counterparty = isBuyer ? deal.getSeller() : deal.getBuyer();
        notificationService.notify(counterparty, "Deal Cancellation Requested",
                String.format("%s has requested to cancel the deal for %s. Reason: %s",
                        requester.getFullName(), deal.getBusiness().getTitle(), deal.getCancellationReason()),
                isBuyer ? "/seller/deals" : "/buyer/deals");

        return mapToResponse(saved);
    }

    @Transactional
    public DealResponse respondCancellation(Long dealId, String responderEmail, RespondCancellationRequest request) {
        User responder = userRepository.findByEmail(responderEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Deal deal = dealRepository.findByIdForUpdate(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal not found"));

        boolean isBuyer = deal.getBuyer().getId().equals(responder.getId());
        boolean isSeller = deal.getSeller().getId().equals(responder.getId());

        if (!isBuyer && !isSeller) {
            throw new AccessDeniedException("Only the counterparty can respond to a cancellation request");
        }

        if (deal.getStatus() != DealStatus.IN_PROGRESS) {
            throw new IllegalStateException("Cannot respond to cancellation: deal is already " + deal.getStatus());
        }

        if (deal.getCancellationRequestedAt() == null) {
            throw new IllegalStateException("There is no pending cancellation request for this deal");
        }

        if (deal.getCancellationRequestedBy().getId().equals(responder.getId())) {
            throw new IllegalStateException("You cannot respond to your own cancellation request");
        }

        if (request == null || request.getAgree() == null) {
            throw new IllegalArgumentException("Agreement decision is required");
        }

        if (Boolean.TRUE.equals(request.getAgree())) {
            // Both parties agree to cancel
            deal.setStatus(DealStatus.CANCELLED);
            deal.setClosedAt(LocalDateTime.now());
            deal.setNotes("Cancelled by mutual agreement. Reason: " + deal.getCancellationReason());

            Deal saved = dealRepository.save(deal);

            auditService.record(responder, "DEAL_CANCELLED_BY_AGREEMENT", "DEAL", saved.getId(),
                    "Deal cancelled by mutual agreement between buyer and seller.");

            notificationService.notify(deal.getBuyer(), "Deal Cancelled",
                    String.format("The deal for %s was cancelled by mutual agreement.", deal.getBusiness().getTitle()),
                    "/buyer/deals");

            notificationService.notify(deal.getSeller(), "Deal Cancelled",
                    String.format("The deal for %s was cancelled by mutual agreement.", deal.getBusiness().getTitle()),
                    "/seller/deals");

            return mapToResponse(saved);
        } else {
            // Counterparty rejects cancellation request; deal remains IN_PROGRESS
            User requestingUser = deal.getCancellationRequestedBy();
            deal.setCancellationRequestedBy(null);
            deal.setCancellationReason(null);
            deal.setCancellationRequestedAt(null);

            Deal saved = dealRepository.save(deal);

            auditService.record(responder, "DEAL_CANCELLATION_DECLINED", "DEAL", saved.getId(),
                    String.format("%s declined the cancellation request. Deal remains in progress.", responder.getFullName()));

            notificationService.notify(requestingUser, "Cancellation Request Declined",
                    String.format("%s declined your request to cancel the deal for %s. The deal remains in progress.",
                            responder.getFullName(), deal.getBusiness().getTitle()),
                    requestingUser.getId().equals(deal.getBuyer().getId()) ? "/buyer/deals" : "/seller/deals");

            return mapToResponse(saved);
        }
    }

    @Transactional
    public DealResponse adminCancelDeal(Long dealId, String adminEmail, AdminCancelDealRequest request) {
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (admin.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only platform administrators can perform administrative cancellations");
        }

        Deal deal = dealRepository.findByIdForUpdate(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal not found"));

        if (deal.getStatus() != DealStatus.IN_PROGRESS) {
            throw new IllegalStateException("Cannot cancel deal: deal is already " + deal.getStatus());
        }

        if (request == null || request.getReason() == null || request.getReason().trim().isEmpty()) {
            throw new IllegalArgumentException("Admin cancellation reason is required");
        }

        deal.setStatus(DealStatus.CANCELLED);
        deal.setClosedAt(LocalDateTime.now());
        deal.setCancellationReason("Admin cancellation: " + request.getReason().trim());
        deal.setNotes("Cancelled by administrator. Reason: " + request.getReason().trim());

        Deal saved = dealRepository.save(deal);

        auditService.record(admin, "DEAL_ADMIN_CANCELLED", "DEAL", saved.getId(),
                "Administrator cancelled deal. Reason: " + request.getReason().trim());

        notificationService.notify(deal.getBuyer(), "Deal Cancelled by Admin",
                String.format("Your deal for %s was cancelled by platform administration. Reason: %s",
                        deal.getBusiness().getTitle(), request.getReason().trim()),
                "/buyer/deals");

        notificationService.notify(deal.getSeller(), "Deal Cancelled by Admin",
                String.format("Your deal for %s was cancelled by platform administration. Reason: %s",
                        deal.getBusiness().getTitle(), request.getReason().trim()),
                "/seller/deals");

        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<DealResponse> getAllDealsAdmin() {
        return dealRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private DealResponse mapToResponse(Deal deal) {
        return DealResponse.builder()
                .id(deal.getId())
                .businessId(deal.getBusiness().getId())
                .businessTitle(deal.getBusiness().getTitle())
                .buyerId(deal.getBuyer().getId())
                .buyerName(deal.getBuyer().getFullName())
                .buyerEmail(deal.getBuyer().getEmail())
                .sellerId(deal.getSeller().getId())
                .sellerName(deal.getSeller().getFullName())
                .sellerEmail(deal.getSeller().getEmail())
                .offerId(deal.getOffer().getId())
                .agreedPrice(deal.getAgreedPrice())
                .currency(deal.getCurrency())
                .status(deal.getStatus().name())
                .buyerConfirmedAt(deal.getBuyerConfirmedAt())
                .sellerConfirmedAt(deal.getSellerConfirmedAt())
                .cancellationRequestedBy(deal.getCancellationRequestedBy() != null ? deal.getCancellationRequestedBy().getId() : null)
                .cancellationRequestedByName(deal.getCancellationRequestedBy() != null ? deal.getCancellationRequestedBy().getFullName() : null)
                .cancellationReason(deal.getCancellationReason())
                .cancellationRequestedAt(deal.getCancellationRequestedAt())
                .cancellationPending(deal.getCancellationRequestedAt() != null)
                .notes(deal.getNotes())
                .closedAt(deal.getClosedAt())
                .createdAt(deal.getCreatedAt())
                .updatedAt(deal.getUpdatedAt())
                .completionNotice(COMPLETION_NOTICE)
                .build();
    }
}
