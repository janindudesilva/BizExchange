package com.businessexchange.business.service;

import com.businessexchange.business.dto.BusinessCreateRequest;
import com.businessexchange.business.dto.BusinessUpdateRequest;
import com.businessexchange.business.dto.BusinessResponse;
import com.businessexchange.business.entity.*;
import com.businessexchange.business.repository.*;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.common.exception.UnverifiedSellerException;
import com.businessexchange.favorite.service.SavedBusinessService;
import com.businessexchange.review.repository.ReviewRepository;
import com.businessexchange.review.service.ReviewService;
import com.businessexchange.seller.entity.SellerProfile;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.seller.repository.SellerProfileRepository;
import com.businessexchange.support.dto.LimitedBusinessView;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.businessexchange.common.response.PageResponse;

@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class BusinessService {

    private final BusinessRepository businessRepository;
    private final BusinessCategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final SellerProfileRepository sellerProfileRepository;
    private final SavedBusinessService savedBusinessService;
    private final ReviewService reviewService;
    private final ReviewRepository reviewRepository;
    private final com.businessexchange.verification.service.VerificationService verificationService;

    @Transactional
    public BusinessResponse createBusiness(BusinessCreateRequest request) {
        throw new org.springframework.security.access.AccessDeniedException("Authentication required to create a business");
    }

    @Transactional
    public BusinessResponse createBusiness(BusinessCreateRequest request, String callerEmail) {
        if (callerEmail == null) {
            throw new org.springframework.security.access.AccessDeniedException("Authentication required to create a business");
        }

        User caller = userRepository.findByEmail(callerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + callerEmail));

        User seller;
        if (caller.getRole() == UserRole.ADMIN && request.getSellerId() != null) {
            seller = userRepository.findById(request.getSellerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Seller not found"));
        } else {
            seller = caller;
        }

        SellerProfile sellerProfile = sellerProfileRepository.findByUserId(seller.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Seller profile not found"));

        if (sellerProfile.getVerificationStatus() != VerificationStatus.APPROVED) {
            throw new UnverifiedSellerException(
                    "Your seller account must be verified by an admin before you can list a business."
            );
        }

        BusinessCategory category = categoryRepository.findByName(request.getCategory())
                .orElseGet(() -> categoryRepository.save(
                        BusinessCategory.builder()
                                .name(request.getCategory())
                                .build()
                ));

        Business business = Business.builder()
                .seller(seller)
                .category(category)
                .title(request.getTitle())
                .description(request.getDescription())
                .location(request.getLocation())
                .address(request.getAddress())
                .askingPrice(request.getAskingPrice())
                .businessAgeYears(request.getBusinessAgeYears())
                .numberOfEmployees(request.getNumberOfEmployees())
                .reasonForSelling(request.getReasonForSelling())
                .status(BusinessStatus.PENDING_REVIEW)
                .build();

        Business saved = businessRepository.save(business);

        // Automatically create a pending verification request for verification officers
        try {
            verificationService.submitForVerification(saved.getId());
        } catch (Exception e) {
            log.warn("Automatic verification submission note for business {}: {}", saved.getId(), e.getMessage());
        }

        return mapToResponse(saved);
    }

    public List<BusinessResponse> getApprovedBusinesses() {
        List<Business> approved = businessRepository.findByStatus(BusinessStatus.APPROVED)
                .stream()
                .filter(business -> business.getVerificationStatus() == VerificationStatus.APPROVED)
                .toList();
        return mapListToResponses(approved, null);
    }

    public PageResponse<BusinessResponse> searchBusinesses(
            String keyword,
            Long categoryId,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String location,
            Pageable pageable,
            String buyerEmail
    ) {
        Specification<Business> spec = BusinessSpecification.filter(
                keyword, categoryId, minPrice, maxPrice, location);

        Page<Business> page = businessRepository.findAll(spec, pageable);
        List<BusinessResponse> content = mapListToResponses(page.getContent(), buyerEmail);

        return new PageResponse<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalPages(),
                page.getTotalElements()
        );
    }

    public List<BusinessResponse> mapListToResponses(List<Business> businesses, String buyerEmail) {
        if (businesses.isEmpty()) {
            return List.of();
        }

        List<Long> sellerIds = businesses.stream()
                .map(b -> b.getSeller().getId())
                .distinct()
                .toList();

        Map<Long, Double> avgRatingMap = new HashMap<>();
        Map<Long, Long> reviewCountMap = new HashMap<>();

        if (!sellerIds.isEmpty()) {
            reviewRepository.findAverageRatingsBySellerIds(sellerIds)
                    .forEach(row -> avgRatingMap.put((Long) row[0], (Double) row[1]));
            reviewRepository.findReviewCountsBySellerIds(sellerIds)
                    .forEach(row -> reviewCountMap.put((Long) row[0], (Long) row[1]));
        }

        return businesses.stream()
                .map(business -> mapToResponseWithRatings(
                        business,
                        buyerEmail,
                        avgRatingMap.get(business.getSeller().getId()),
                        reviewCountMap.getOrDefault(business.getSeller().getId(), 0L)
                ))
                .toList();
    }

    public BusinessResponse getBusinessById(Long id) {
        return getBusinessById(id, null);
    }

    public BusinessResponse getBusinessById(Long id, String callerEmail) {
        Business business = businessRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        boolean isPubliclyVisible = business.getStatus() == BusinessStatus.APPROVED 
                && business.getVerificationStatus() == VerificationStatus.APPROVED;

        if (!isPubliclyVisible) {
            if (callerEmail == null) {
                throw new ResourceNotFoundException("Business not found or listing not public yet");
            }
            User caller = userRepository.findByEmail(callerEmail)
                    .orElseThrow(() -> new ResourceNotFoundException("Business not found"));
            boolean isAdmin = caller.getRole() == UserRole.ADMIN;
            boolean isOfficer = caller.getRole() == UserRole.VERIFICATION_OFFICER;
            boolean isOwner = business.getSeller() != null && business.getSeller().getEmail().equals(callerEmail);
            if (!isAdmin && !isOfficer && !isOwner) {
                throw new ResourceNotFoundException("Business not found or listing not public yet");
            }
        }

        return mapToResponse(business, callerEmail);
    }

    @Transactional
    public BusinessResponse updateBusiness(Long id, BusinessUpdateRequest request) {
        return updateBusiness(id, request, null);
    }

    @Transactional
    public BusinessResponse updateBusiness(Long id, BusinessUpdateRequest request, String callerEmail) {
        Business business = businessRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        if (callerEmail != null) {
            User caller = userRepository.findByEmail(callerEmail)
                    .orElseThrow(() -> new ResourceNotFoundException("Caller user not found"));
            boolean isAdmin = caller.getRole() == UserRole.ADMIN;
            boolean isOwner = business.getSeller().getEmail().equals(callerEmail);
            if (!isAdmin && !isOwner) {
                throw new org.springframework.security.access.AccessDeniedException("You do not have permission to update this business");
            }
        }

        business.setTitle(request.getTitle());
        business.setDescription(request.getDescription());
        business.setLocation(request.getLocation());
        business.setAddress(request.getAddress());
        business.setAskingPrice(request.getAskingPrice());
        business.setBusinessAgeYears(request.getBusinessAgeYears());
        business.setNumberOfEmployees(request.getNumberOfEmployees());
        business.setReasonForSelling(request.getReasonForSelling());

        if (request.getCategory() != null) {
            BusinessCategory category = categoryRepository.findByName(request.getCategory())
                    .orElseGet(() -> categoryRepository.save(
                            BusinessCategory.builder().name(request.getCategory()).build()
                    ));
            business.setCategory(category);
        }

        // Reset to PENDING_REVIEW so admin re-approves after edits
        business.setStatus(BusinessStatus.PENDING_REVIEW);

        return mapToResponse(businessRepository.save(business));
    }

    @Transactional
    public void deleteBusiness(Long id) {
        deleteBusiness(id, null);
    }

    @Transactional
    public void deleteBusiness(Long id, String callerEmail) {
        Business business = businessRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        if (callerEmail != null) {
            User caller = userRepository.findByEmail(callerEmail)
                    .orElseThrow(() -> new ResourceNotFoundException("Caller user not found"));
            boolean isAdmin = caller.getRole() == UserRole.ADMIN;
            boolean isOwner = business.getSeller().getEmail().equals(callerEmail);
            if (!isAdmin && !isOwner) {
                throw new org.springframework.security.access.AccessDeniedException("You do not have permission to delete this business");
            }
        }

        businessRepository.delete(business);
    }

    public BusinessResponse mapToResponse(Business business) {
        return mapToResponse(business, null);
    }

    public BusinessResponse mapToResponse(Business business, String buyerEmail) {
        Long sellerId = business.getSeller().getId();
        // Single-business lookup: individual queries are acceptable outside list context
        Double averageRating = reviewService.getSellerAverageRating(sellerId);
        Long reviewCount = reviewService.getSellerReviewCount(sellerId);
        return mapToResponseWithRatings(business, buyerEmail, averageRating, reviewCount);
    }

    /**
     * Map business to response DTO using pre-fetched rating data (used in batch search to avoid N+1).
     */
    public BusinessResponse mapToResponseWithRatings(
            Business business,
            String buyerEmail,
            Double averageRating,
            Long reviewCount
    ) {
        Boolean isFavorited = null;
        if (buyerEmail != null) {
            try {
                isFavorited = savedBusinessService.isBusinessSaved(buyerEmail, business.getId());
            } catch (Exception e) {
                log.debug("Failed to check saved status for buyer {}: {}", buyerEmail, e.getMessage());
                isFavorited = false;
            }
        }

        Long sellerId = business.getSeller().getId();

        return BusinessResponse.builder()
                .id(business.getId())
                .title(business.getTitle())
                .category(business.getCategory().getName())
                .sellerName(business.getSeller().getFullName())
                .description(business.getDescription())
                .location(business.getLocation())
                .askingPrice(business.getAskingPrice())
                .status(business.getStatus().name())
                .verificationStatus(business.getVerificationStatus().name())
                .rejectionReason(business.getRejectionReason())
                .isFavorited(isFavorited)
                .sellerId(sellerId)
                .averageRating(averageRating)
                .reviewCount(reviewCount)
                .build();
    }

    public List<BusinessResponse> getBusinessesBySeller(Long sellerId) {
        return getBusinessesBySeller(sellerId, null);
    }

    public List<BusinessResponse> getBusinessesBySeller(Long sellerId, String callerEmail) {
        if (callerEmail != null) {
            User caller = userRepository.findByEmail(callerEmail)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + callerEmail));
            boolean isAdmin = caller.getRole() == UserRole.ADMIN;
            boolean isSelf = caller.getId().equals(sellerId);
            if (!isAdmin && !isSelf) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "You do not have permission to view this seller's businesses");
            }
        } else {
            throw new org.springframework.security.access.AccessDeniedException("Authentication required");
        }
        List<Business> businesses = businessRepository.findBySellerId(sellerId);
        return mapListToResponses(businesses, callerEmail);
    }

    public LimitedBusinessView getLimitedView(Long businessId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));
        return LimitedBusinessView.builder()
                .id(business.getId())
                .title(business.getTitle())
                .sellerName(business.getSeller().getFullName())
                .status(business.getStatus())
                .build();
    }
}