package com.businessexchange.seller.controller;

import com.businessexchange.business.dto.BusinessFileResponse;
import com.businessexchange.business.service.BusinessFileService;
import com.businessexchange.seller.dto.RejectSellerRequest;
import com.businessexchange.seller.dto.ReviewNotesRequest;
import com.businessexchange.seller.dto.ReportSuspiciousRequest;
import com.businessexchange.seller.dto.SellerProfileResponseDto;
import com.businessexchange.seller.service.SellerService;
import jakarta.validation.Valid;
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
    private final BusinessFileService businessFileService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('VERIFICATION_OFFICER')")
    public ResponseEntity<List<SellerProfileResponseDto>> getAllSellers() {
        return ResponseEntity.ok(sellerService.getAllSellers());
    }

    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN') or hasRole('VERIFICATION_OFFICER')")
    public ResponseEntity<List<SellerProfileResponseDto>> getPendingSellers() {
        return ResponseEntity.ok(sellerService.getPendingSellers());
    }

    @PutMapping("/{sellerId}/approve")
    @PreAuthorize("hasRole('ADMIN') or hasRole('VERIFICATION_OFFICER')")
    public ResponseEntity<SellerProfileResponseDto> approveSeller(@PathVariable Long sellerId) {
        return ResponseEntity.ok(sellerService.approveSeller(sellerId));
    }

    @PutMapping("/{sellerId}/reject")
    @PreAuthorize("hasRole('ADMIN') or hasRole('VERIFICATION_OFFICER')")
    public ResponseEntity<SellerProfileResponseDto> rejectSeller(
            @PathVariable Long sellerId,
            @RequestBody @Valid RejectSellerRequest request) {
        return ResponseEntity.ok(sellerService.rejectSeller(sellerId, request.getReason()));
    }

    @PutMapping("/{sellerId}/notes")
    @PreAuthorize("hasRole('ADMIN') or hasRole('VERIFICATION_OFFICER')")
    public ResponseEntity<SellerProfileResponseDto> addNotes(
            @PathVariable Long sellerId,
            @RequestBody @Valid ReviewNotesRequest request) {
        return ResponseEntity.ok(sellerService.addReviewNotes(sellerId, request.getNotes()));
    }

    @PutMapping("/{sellerId}/report-suspicious")
    @PreAuthorize("hasRole('ADMIN') or hasRole('VERIFICATION_OFFICER')")
    public ResponseEntity<Void> reportSuspicious(
            @PathVariable Long sellerId,
            @RequestBody @Valid ReportSuspiciousRequest request) {
        sellerService.flagSuspicious(sellerId, request.getReason());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{sellerId}/documents")
    @PreAuthorize("hasRole('ADMIN') or hasRole('VERIFICATION_OFFICER')")
    public ResponseEntity<List<BusinessFileResponse>> getSellerDocuments(@PathVariable Long sellerId) {
        return ResponseEntity.ok(businessFileService.findAllDocumentsBySellerId(sellerId));
    }
}