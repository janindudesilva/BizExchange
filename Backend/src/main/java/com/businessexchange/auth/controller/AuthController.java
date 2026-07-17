package com.businessexchange.auth.controller;

import com.businessexchange.auth.dto.*;
import com.businessexchange.auth.service.AuthService;
import com.businessexchange.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register/buyer")
    public ApiResponse<AuthResponse> registerBuyer(@Valid @RequestBody RegisterBuyerRequest request) {
        AuthResponse response = authService.registerBuyer(request);
        return ApiResponse.success("Buyer registered successfully", response);
    }

    @PostMapping("/register/seller")
    public ApiResponse<AuthResponse> registerSeller(@Valid @RequestBody RegisterSellerRequest request) {
        AuthResponse response = authService.registerSeller(request);
        return ApiResponse.success("Seller registered successfully", response);
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ApiResponse.success("Login successful", response);
    }

    @PostMapping("/verify-email")
    public ApiResponse<Void> verifyEmail(@RequestParam String token) {
        authService.verifyEmail(token);
        return ApiResponse.success("Email verified successfully", null);
    }

    @PostMapping("/resend-verification")
    public ApiResponse<Void> resendVerificationEmail(@RequestParam String email) {
        authService.resendVerificationEmail(email);
        return ApiResponse.success("Verification email sent successfully", null);
    }
}
