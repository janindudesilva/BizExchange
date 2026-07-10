package com.businessexchange.business.service;

import com.businessexchange.business.dto.BusinessCreateRequest;
import com.businessexchange.business.dto.BusinessResponse;
import com.businessexchange.business.entity.*;
import com.businessexchange.business.repository.*;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.common.exception.UnverifiedSellerException;
import com.businessexchange.seller.entity.SellerProfile;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.seller.repository.SellerProfileRepository;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BusinessService {

    private final BusinessRepository businessRepository;
    private final BusinessCategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final SellerProfileRepository sellerProfileRepository; // ← added

    @Transactional
    public BusinessResponse createBusiness(BusinessCreateRequest request) {
        User seller = userRepository.findById(request.getSellerId())
                .orElseThrow(() -> new ResourceNotFoundException("Seller not found"));

        // ← added: block unverified sellers from listing
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

        return mapToResponse(saved);
    }

    public List<BusinessResponse> getApprovedBusinesses() {
        return businessRepository.findByStatus(BusinessStatus.APPROVED)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public BusinessResponse getBusinessById(Long id) {
        Business business = businessRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        return mapToResponse(business);
    }

    public BusinessResponse mapToResponse(Business business) {
        return BusinessResponse.builder()
                .id(business.getId())
                .title(business.getTitle())
                .category(business.getCategory().getName())
                .sellerName(business.getSeller().getFullName())
                .description(business.getDescription())
                .location(business.getLocation())
                .askingPrice(business.getAskingPrice())
                .status(business.getStatus().name())
                .build();
    }

    public List<BusinessResponse> getBusinessesBySeller(Long sellerId) {
        return businessRepository.findBySellerId(sellerId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }
}