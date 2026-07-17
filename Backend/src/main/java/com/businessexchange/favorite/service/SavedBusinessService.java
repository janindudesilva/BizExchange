package com.businessexchange.favorite.service;

import com.businessexchange.business.dto.BusinessResponse;
import com.businessexchange.business.entity.Business;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.favorite.dto.SavedBusinessResponse;
import com.businessexchange.favorite.entity.SavedBusiness;
import com.businessexchange.favorite.repository.SavedBusinessRepository;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SavedBusinessService {

    private final SavedBusinessRepository savedBusinessRepository;
    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;

    @Transactional
    public SavedBusinessResponse saveBusiness(String buyerEmail, Long businessId) {
        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer not found"));

        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        if (savedBusinessRepository.existsByBuyerIdAndBusinessId(buyer.getId(), businessId)) {
            throw new IllegalStateException("Business already saved");
        }

        SavedBusiness savedBusiness = SavedBusiness.builder()
                .buyer(buyer)
                .business(business)
                .build();

        savedBusinessRepository.save(savedBusiness);

        return mapToResponse(savedBusiness);
    }

    @Transactional
    public void unsaveBusiness(String buyerEmail, Long businessId) {
        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer not found"));

        if (!savedBusinessRepository.existsByBuyerIdAndBusinessId(buyer.getId(), businessId)) {
            throw new IllegalStateException("Business not saved");
        }

        savedBusinessRepository.deleteByBuyerIdAndBusinessId(buyer.getId(), businessId);
    }

    public List<SavedBusinessResponse> getSavedBusinesses(String buyerEmail) {
        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer not found"));

        return savedBusinessRepository.findByBuyerIdOrderBySavedAtDesc(buyer.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public boolean isBusinessSaved(String buyerEmail, Long businessId) {
        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer not found"));

        return savedBusinessRepository.existsByBuyerIdAndBusinessId(buyer.getId(), businessId);
    }

    private SavedBusinessResponse mapToResponse(SavedBusiness savedBusiness) {
        Business business = savedBusiness.getBusiness();

        return SavedBusinessResponse.builder()
                .id(savedBusiness.getId())
                .businessId(business.getId())
                .title(business.getTitle())
                .category(business.getCategory().getName())
                .sellerName(business.getSeller().getFullName())
                .description(business.getDescription())
                .location(business.getLocation())
                .askingPrice(business.getAskingPrice())
                .status(business.getStatus().name())
                .savedAt(savedBusiness.getSavedAt().toString())
                .build();
    }
}
