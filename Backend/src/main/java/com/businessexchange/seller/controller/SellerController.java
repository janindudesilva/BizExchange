package com.businessexchange.seller.controller;

import com.businessexchange.seller.dto.SellerProfileResponseDto;
import com.businessexchange.seller.service.SellerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/sellers")
@RequiredArgsConstructor
public class SellerController {

    private final SellerService sellerService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SellerProfileResponseDto>> getAllSellers() {
        return ResponseEntity.ok(sellerService.getAllSellers());
    }

    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SellerProfileResponseDto>> getPendingSellers() {
        return ResponseEntity.ok(sellerService.getPendingSellers());
    }

    @PutMapping("/{sellerId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SellerProfileResponseDto> approveSeller(@PathVariable Long sellerId) {
        return ResponseEntity.ok(sellerService.approveSeller(sellerId));
    }

    @PutMapping("/{sellerId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SellerProfileResponseDto> rejectSeller(@PathVariable Long sellerId) {
        return ResponseEntity.ok(sellerService.rejectSeller(sellerId));
    }
}