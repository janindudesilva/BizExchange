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

    @GetMapping("/{userId}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<SellerProfileResponseDto> getMyProfile(@PathVariable Long userId) {
        return ResponseEntity.ok(sellerService.getSellerByUserId(userId));
    }

    @PutMapping("/{userId}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<SellerProfileResponseDto> updateMyProfile(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateSellerProfileRequest request) {
        return ResponseEntity.ok(sellerService.updateSellerProfile(userId, request));
    }
}