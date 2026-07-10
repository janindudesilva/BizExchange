package com.businessexchange.seller.service;

import com.businessexchange.seller.dto.SellerProfileResponseDto;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.seller.mapper.SellerMapper;
import com.businessexchange.seller.repository.SellerProfileRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.seller.entity.SellerProfile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SellerService {

    private final SellerProfileRepository sellerProfileRepository;
    private final SellerMapper sellerMapper;

    public List<SellerProfileResponseDto> getAllSellers() {
        return sellerProfileRepository.findAll()
                .stream()
                .map(sellerMapper::toDto)
                .toList();
    }

    public SellerProfileResponseDto getSellerByUserId(Long userId) {
        SellerProfile sellerProfile = sellerProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Seller profile not found"));
        return sellerMapper.toDto(sellerProfile);
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
}


