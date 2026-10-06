package com.businessexchange.seller.controller;

import com.businessexchange.seller.dto.SellerProfileResponseDto;
import com.businessexchange.seller.dto.UpdateSellerProfileRequest;
import com.businessexchange.seller.service.SellerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/seller/profile")
@RequiredArgsConstructor
public class SellerProfileController {

    private final SellerService sellerService;
    private final com.businessexchange.user.repository.UserRepository userRepository;

    @GetMapping("/{userId}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<SellerProfileResponseDto> getMyProfile(
            @PathVariable Long userId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        verifyProfileOwnership(userId, userDetails);
        return ResponseEntity.ok(sellerService.getSellerByUserId(userId));
    }

    @PutMapping("/{userId}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<SellerProfileResponseDto> updateMyProfile(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateSellerProfileRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        verifyProfileOwnership(userId, userDetails);
        return ResponseEntity.ok(sellerService.updateSellerProfile(userId, request));
    }

    private void verifyProfileOwnership(Long targetUserId, org.springframework.security.core.userdetails.UserDetails userDetails) {
        if (userDetails == null) {
            throw new org.springframework.security.access.AccessDeniedException("Not authenticated");
        }
        com.businessexchange.user.entity.User caller = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new com.businessexchange.common.exception.ResourceNotFoundException("User not found"));
        boolean isAdmin = caller.getRole() == com.businessexchange.user.entity.UserRole.ADMIN;
        boolean isOwner = caller.getId().equals(targetUserId);
        if (!isAdmin && !isOwner) {
            throw new org.springframework.security.access.AccessDeniedException("You are not authorized to view or edit this seller profile");
        }
    }
}