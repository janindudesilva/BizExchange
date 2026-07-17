package com.businessexchange.seller.service;

import com.businessexchange.seller.dto.SellerProfileResponseDto;
import com.businessexchange.seller.dto.UpdateSellerProfileRequest;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.seller.mapper.SellerMapper;
import com.businessexchange.seller.repository.SellerProfileRepository;
import com.businessexchange.review.service.ReviewService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.seller.entity.SellerProfile;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.repository.UserRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SellerService {

    private final SellerProfileRepository sellerProfileRepository;
    private final SellerMapper sellerMapper;
    private final UserRepository userRepository;
    private final ReviewService reviewService;

    public List<SellerProfileResponseDto> getAllSellers() {
        return sellerProfileRepository.findAll()
                .stream()
                .map(sellerMapper::toDto)
                .toList();
    }

    public SellerProfileResponseDto getSellerByUserId(Long userId) {
        SellerProfile sellerProfile = sellerProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Seller profile not found"));
        
        SellerProfileResponseDto dto = sellerMapper.toDto(sellerProfile);
        
        // Add rating information
        Double averageRating = reviewService.getSellerAverageRating(userId);
        Long reviewCount = reviewService.getSellerReviewCount(userId);
        
        dto.setAverageRating(averageRating);
        dto.setReviewCount(reviewCount);
        
        return dto;
    }

    public List<SellerProfileResponseDto> getPendingSellers() {
        return sellerProfileRepository.findByVerificationStatus(VerificationStatus.PENDING)
                .stream()
                .map(sellerMapper::toDto)
                .toList();
    }

    @Transactional
    public SellerProfileResponseDto approveSeller(Long sellerId) {
        SellerProfile sellerProfile = sellerProfileRepository.findById(sellerId)
                .orElseThrow(() -> new ResourceNotFoundException("Seller profile not found"));

        sellerProfile.setVerificationStatus(VerificationStatus.APPROVED);
        SellerProfile saved = sellerProfileRepository.save(sellerProfile);

        return sellerMapper.toDto(saved);
    }

    @Transactional
    public SellerProfileResponseDto rejectSeller(Long sellerId) {
        SellerProfile sellerProfile = sellerProfileRepository.findById(sellerId)
                .orElseThrow(() -> new ResourceNotFoundException("Seller profile not found"));

        sellerProfile.setVerificationStatus(VerificationStatus.REJECTED);
        SellerProfile saved = sellerProfileRepository.save(sellerProfile);

        return sellerMapper.toDto(saved);
    }

    @Transactional
    public SellerProfileResponseDto updateSellerProfile(Long userId, UpdateSellerProfileRequest request) {
        SellerProfile sellerProfile = sellerProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Seller profile not found"));

        sellerProfile.setNicOrPassport(request.getNicOrPassport());
        sellerProfile.setAddress(request.getAddress());
        sellerProfile.setBusinessOwnerType(request.getBusinessOwnerType());

        User user = sellerProfile.getUser();

        if (request.getPhoneNumber() != null) {
            user.setPhone(request.getPhoneNumber());
        }

        if (request.getEmail() != null && !request.getEmail().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new IllegalArgumentException("Email already in use");
            }
            user.setEmail(request.getEmail());
        }

        userRepository.save(user);
        SellerProfile saved = sellerProfileRepository.save(sellerProfile);
        return sellerMapper.toDto(saved);
    }
}


