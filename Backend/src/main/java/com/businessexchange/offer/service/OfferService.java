package com.businessexchange.offer.service;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessStatus;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.common.audit.service.AuditService;
import com.businessexchange.common.exception.DuplicateResourceException;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.deal.entity.Deal;
import com.businessexchange.deal.entity.DealStatus;
import com.businessexchange.deal.repository.DealRepository;
import com.businessexchange.inquiry.entity.Inquiry;
import com.businessexchange.inquiry.repository.InquiryRepository;
import com.businessexchange.notification.service.NotificationService;
import com.businessexchange.offer.dto.OfferCreateRequest;
import com.businessexchange.offer.dto.OfferResponse;
import com.businessexchange.offer.dto.RejectOfferRequest;
import com.businessexchange.offer.entity.Offer;
import com.businessexchange.offer.entity.OfferStatus;
import com.businessexchange.offer.repository.OfferRepository;
import com.businessexchange.seller.entity.SellerProfile;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.seller.repository.SellerProfileRepository;
import com.businessexchange.user.entity.AccountStatus;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OfferService {

    private final OfferRepository offerRepository;
    private final DealRepository dealRepository;
    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;
    private final SellerProfileRepository sellerProfileRepository;
    private final InquiryRepository inquiryRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final EntityManager entityManager;

    @Transactional
    public OfferResponse createOffer(String buyerEmail, OfferCreateRequest request) {
        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer not found"));

        Business business = businessRepository.findByIdForUpdate(request.getBusinessId())
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        if (business.getSeller().getId().equals(buyer.getId())) {
            throw new IllegalArgumentException("You cannot make an offer on your own business");
        }

        if (business.getStatus() == BusinessStatus.SOLD) {
            throw new IllegalStateException("Business is already marked as sold");
        }

        if (business.getStatus() != BusinessStatus.APPROVED
                || business.getVerificationStatus() != VerificationStatus.APPROVED) {
            throw new IllegalStateException("Business is not eligible to receive offers");
        }

        // Validate seller eligibility
        User seller = business.getSeller();
        if (seller.getStatus() != AccountStatus.ACTIVE) {
            throw new IllegalStateException("Seller account is not active");
        }

        SellerProfile sellerProfile = sellerProfileRepository.findByUserId(seller.getId())
                .orElse(null);
        if (sellerProfile == null
                || sellerProfile.getVerificationStatus() != VerificationStatus.APPROVED
                || Boolean.TRUE.equals(sellerProfile.getFlaggedSuspicious())) {
            throw new IllegalStateException("Seller is not currently eligible to receive offers");
        }

        // Block new offers while business has an active deal
        if (dealRepository.existsByBusinessIdAndStatus(business.getId(), DealStatus.IN_PROGRESS)) {
            throw new IllegalStateException("This business currently has an active deal in progress");
        }

        // Prevent duplicate pending offers from same buyer for same business
        if (offerRepository.existsByBusinessIdAndBuyerIdAndStatus(business.getId(), buyer.getId(), OfferStatus.PENDING)) {
            throw new DuplicateResourceException("You already have an active pending offer for this business");
        }

        // Validate positive amount
        BigDecimal amount = request.getAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Offer amount must be greater than zero");
        }
        amount = amount.setScale(2, RoundingMode.HALF_UP);

        String currency = (request.getCurrency() != null && !request.getCurrency().isBlank())
                ? request.getCurrency().trim().toUpperCase()
                : "LKR";
        if (!"LKR".equals(currency)) {
            throw new IllegalArgumentException("Offer currency must match the listing currency (LKR)");
        }

        // Optional inquiry linking
        Inquiry inquiry = null;
        if (request.getInquiryId() != null) {
            inquiry = inquiryRepository.findById(request.getInquiryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Inquiry not found"));
            if (!inquiry.getBuyer().getId().equals(buyer.getId()) || !inquiry.getBusiness().getId().equals(business.getId())) {
                throw new AccessDeniedException("Inquiry does not belong to this buyer and business");
            }
        }

        Offer offer = Offer.builder()
                .business(business)
                .buyer(buyer)
                .seller(seller)
                .inquiry(inquiry)
                .amount(amount)
                .currency(currency)
                .message(request.getMessage())
                .status(OfferStatus.PENDING)
                .expiresAt(request.getExpiresAt())
                .build();

        Offer saved = offerRepository.save(offer);

        // Audit and notify
        auditService.record(buyer, "OFFER_SUBMITTED", "OFFER", saved.getId(),
                String.format("Submitted offer of %s %s on business: %s", saved.getCurrency(), saved.getAmount(), business.getTitle()));

        notificationService.notify(seller, "New Offer Received",
                String.format("You received an offer of %s %s for %s", saved.getCurrency(), saved.getAmount(), business.getTitle()),
                "/seller/offers");

        return mapToResponse(saved, null);
    }

    @Transactional
    public OfferResponse withdrawOffer(Long offerId, String buyerEmail) {
        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer not found"));

        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found"));

        if (!offer.getBuyer().getId().equals(buyer.getId())) {
            throw new AccessDeniedException("You are not authorized to withdraw this offer");
        }

        if (offer.getStatus() != OfferStatus.PENDING) {
            throw new IllegalStateException("Only pending offers can be withdrawn");
        }

        offer.setStatus(OfferStatus.WITHDRAWN);
        Offer saved = offerRepository.save(offer);

        auditService.record(buyer, "OFFER_WITHDRAWN", "OFFER", saved.getId(),
                "Buyer withdrew offer on business: " + offer.getBusiness().getTitle());

        notificationService.notify(offer.getSeller(), "Offer Withdrawn",
                String.format("%s withdrew their offer on %s", buyer.getFullName(), offer.getBusiness().getTitle()),
                "/seller/offers");

        return mapToResponse(saved, null);
    }

    @Transactional
    public OfferResponse rejectOffer(Long offerId, String sellerEmail, RejectOfferRequest request) {
        User seller = userRepository.findByEmail(sellerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Seller not found"));

        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found"));

        if (!offer.getSeller().getId().equals(seller.getId())) {
            throw new AccessDeniedException("You are not authorized to reject this offer");
        }

        if (offer.getStatus() != OfferStatus.PENDING) {
            throw new IllegalStateException("Only pending offers can be rejected");
        }

        String reason = (request != null && request.getReason() != null) ? request.getReason().trim() : null;
        offer.setStatus(OfferStatus.REJECTED);
        offer.setRejectionReason(reason);
        Offer saved = offerRepository.save(offer);

        auditService.record(seller, "OFFER_REJECTED", "OFFER", saved.getId(),
                "Seller rejected offer. Reason: " + (reason != null ? reason : "No reason provided"));

        notificationService.notify(offer.getBuyer(), "Offer Rejected",
                String.format("Your offer for %s was rejected.", offer.getBusiness().getTitle()),
                "/buyer/offers");

        return mapToResponse(saved, null);
    }

    @Transactional
    public OfferResponse acceptOffer(Long offerId, String sellerEmail) {
        User seller = userRepository.findByEmail(sellerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Seller not found"));

        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found"));

        if (!offer.getSeller().getId().equals(seller.getId())) {
            throw new AccessDeniedException("You are not authorized to accept this offer");
        }

        // Serialize acceptance per business with pessimistic write lock
        Business business = businessRepository.findByIdForUpdate(offer.getBusiness().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Business listing not found"));

        // Refresh offer under the business lock to detect concurrent state changes
        entityManager.refresh(offer);

        // Idempotency: safe repeated acceptance
        if (offer.getStatus() == OfferStatus.ACCEPTED) {
            Optional<Deal> existingDeal = dealRepository.findByOfferId(offer.getId());
            return mapToResponse(offer, existingDeal.map(Deal::getId).orElse(null));
        }

        if (offer.getStatus() != OfferStatus.PENDING) {
            throw new IllegalStateException("Cannot accept offer with status: " + offer.getStatus());
        }

        if (business.getStatus() == BusinessStatus.SOLD) {
            throw new IllegalStateException("Business is already marked as sold");
        }

        if (business.getStatus() != BusinessStatus.APPROVED
                || business.getVerificationStatus() != VerificationStatus.APPROVED) {
            throw new IllegalStateException("Business listing is not currently eligible for deal creation");
        }

        if (seller.getStatus() != AccountStatus.ACTIVE) {
            throw new IllegalStateException("Seller account is not active");
        }

        SellerProfile sellerProfile = sellerProfileRepository.findByUserId(seller.getId())
                .orElse(null);
        if (sellerProfile == null
                || sellerProfile.getVerificationStatus() != VerificationStatus.APPROVED
                || Boolean.TRUE.equals(sellerProfile.getFlaggedSuspicious())) {
            throw new IllegalStateException("Seller is not currently eligible to accept offers");
        }

        if (dealRepository.existsByBusinessIdAndStatus(business.getId(), DealStatus.IN_PROGRESS)) {
            throw new IllegalStateException("This business already has an active deal in progress");
        }

        // Mark this offer as accepted
        offer.setStatus(OfferStatus.ACCEPTED);
        offerRepository.save(offer);

        // Create exactly one Deal record
        Deal deal = Deal.builder()
                .business(business)
                .buyer(offer.getBuyer())
                .seller(seller)
                .offer(offer)
                .agreedPrice(offer.getAmount())
                .currency(offer.getCurrency())
                .status(DealStatus.IN_PROGRESS)
                .build();
        Deal savedDeal = dealRepository.save(deal);

        // Reject other pending offers for this business with a clear recorded reason
        List<Offer> otherPendingOffers = offerRepository.findByBusinessIdAndStatusAndIdNot(
                business.getId(), OfferStatus.PENDING, offer.getId()
        );
        for (Offer other : otherPendingOffers) {
            other.setStatus(OfferStatus.REJECTED);
            other.setRejectionReason("Another offer was accepted for this business");
            offerRepository.save(other);

            auditService.record(seller, "OFFER_AUTO_REJECTED", "OFFER", other.getId(),
                    "Automatically rejected because offer " + offer.getId() + " was accepted");

            notificationService.notify(other.getBuyer(), "Offer Status Update",
                    String.format("Your offer on %s was not accepted as another offer was chosen.", business.getTitle()),
                    "/buyer/offers");
        }

        // Audit events identifying the actual acting user
        auditService.record(seller, "OFFER_ACCEPTED", "OFFER", offer.getId(),
                "Seller accepted offer. Deal created with ID: " + savedDeal.getId());

        auditService.record(seller, "DEAL_CREATED", "DEAL", savedDeal.getId(),
                String.format("Deal created from offer %d for %s %s with buyer %s",
                        offer.getId(), savedDeal.getCurrency(), savedDeal.getAgreedPrice(), offer.getBuyer().getFullName()));

        // Notifications
        notificationService.notify(offer.getBuyer(), "Offer Accepted!",
                String.format("Congratulations! Your offer of %s %s for %s was accepted. Deal is now in progress.",
                        offer.getCurrency(), offer.getAmount(), business.getTitle()),
                "/buyer/deals");

        notificationService.notify(seller, "Deal In Progress",
                String.format("Deal started with %s for %s", offer.getBuyer().getFullName(), business.getTitle()),
                "/seller/deals");

        return mapToResponse(offer, savedDeal.getId());
    }

    @Transactional(readOnly = true)
    public OfferResponse getOfferById(Long offerId, String requesterEmail) {
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found"));

        boolean isBuyer = offer.getBuyer().getId().equals(requester.getId());
        boolean isSeller = offer.getSeller().getId().equals(requester.getId());
        boolean isAdmin = requester.getRole() == UserRole.ADMIN;

        if (!isBuyer && !isSeller && !isAdmin) {
            throw new AccessDeniedException("You are not authorized to view this offer");
        }

        Long dealId = dealRepository.findByOfferId(offer.getId()).map(Deal::getId).orElse(null);
        return mapToResponse(offer, dealId);
    }

    @Transactional(readOnly = true)
    public List<OfferResponse> getSentOffers(String buyerEmail) {
        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer not found"));

        return offerRepository.findByBuyerIdOrderByCreatedAtDesc(buyer.getId())
                .stream()
                .map(o -> mapToResponse(o, dealRepository.findByOfferId(o.getId()).map(Deal::getId).orElse(null)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OfferResponse> getReceivedOffers(String sellerEmail) {
        User seller = userRepository.findByEmail(sellerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Seller not found"));

        return offerRepository.findBySellerIdOrderByCreatedAtDesc(seller.getId())
                .stream()
                .map(o -> mapToResponse(o, dealRepository.findByOfferId(o.getId()).map(Deal::getId).orElse(null)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OfferResponse> getOffersByBusiness(Long businessId, String requesterEmail) {
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        boolean isSeller = business.getSeller().getId().equals(requester.getId());
        boolean isAdmin = requester.getRole() == UserRole.ADMIN;
        if (!isSeller && !isAdmin) {
            throw new AccessDeniedException("Only the seller or admin can view all offers for this business");
        }

        return offerRepository.findByBusinessIdOrderByCreatedAtDesc(businessId)
                .stream()
                .map(o -> mapToResponse(o, dealRepository.findByOfferId(o.getId()).map(Deal::getId).orElse(null)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OfferResponse> getOffersByInquiry(Long inquiryId, String requesterEmail) {
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new ResourceNotFoundException("Inquiry not found"));

        boolean isBuyer = inquiry.getBuyer().getId().equals(requester.getId());
        boolean isSeller = inquiry.getSeller().getId().equals(requester.getId());
        boolean isAdmin = requester.getRole() == UserRole.ADMIN;

        if (!isBuyer && !isSeller && !isAdmin) {
            throw new AccessDeniedException("You are not part of this inquiry conversation");
        }

        return offerRepository.findByInquiryIdOrderByCreatedAtDesc(inquiryId)
                .stream()
                .map(o -> mapToResponse(o, dealRepository.findByOfferId(o.getId()).map(Deal::getId).orElse(null)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OfferResponse> getAllOffersAdmin() {
        return offerRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(o -> mapToResponse(o, dealRepository.findByOfferId(o.getId()).map(Deal::getId).orElse(null)))
                .toList();
    }

    private OfferResponse mapToResponse(Offer offer, Long dealId) {
        return OfferResponse.builder()
                .id(offer.getId())
                .businessId(offer.getBusiness().getId())
                .businessTitle(offer.getBusiness().getTitle())
                .buyerId(offer.getBuyer().getId())
                .buyerName(offer.getBuyer().getFullName())
                .buyerEmail(offer.getBuyer().getEmail())
                .sellerId(offer.getSeller().getId())
                .sellerName(offer.getSeller().getFullName())
                .sellerEmail(offer.getSeller().getEmail())
                .inquiryId(offer.getInquiry() != null ? offer.getInquiry().getId() : null)
                .amount(offer.getAmount())
                .currency(offer.getCurrency())
                .message(offer.getMessage())
                .status(offer.getStatus().name())
                .rejectionReason(offer.getRejectionReason())
                .dealId(dealId)
                .expiresAt(offer.getExpiresAt())
                .createdAt(offer.getCreatedAt())
                .updatedAt(offer.getUpdatedAt())
                .build();
    }
}
