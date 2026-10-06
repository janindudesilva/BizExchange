package com.businessexchange.auth.controller;

import com.businessexchange.auth.dto.*;
import com.businessexchange.auth.service.AuthService;
import com.businessexchange.auth.service.PasswordResetService;
import com.businessexchange.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;


@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

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
    public ApiResponse<Void> verifyEmail(
            @RequestParam(required = false) String token,
            @RequestBody(required = false) Map<String, String> body) {
        String verificationToken = token != null ? token : (body != null ? body.get("token") : null);
        if (verificationToken == null || verificationToken.isBlank()) {
            throw new IllegalArgumentException("Verification token is required");
        }
        authService.verifyEmail(verificationToken);
        return ApiResponse.success("Email verified successfully", null);
    }

    @PostMapping("/resend-verification")
    public ApiResponse<Void> resendVerificationEmail(
            @RequestParam(required = false) String email,
            @RequestBody(required = false) Map<String, String> body) {
        String targetEmail = email != null ? email : (body != null ? body.get("email") : null);
        if (targetEmail == null || targetEmail.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        authService.resendVerificationEmail(targetEmail);
        return ApiResponse.success("If an unverified account exists for this email, a verification link has been sent.", null);
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Map<String, Object>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        passwordResetService.requestReset(req.email());
        return ApiResponse.success(
                "If an account exists for this email, a code has been sent.",
                Map.of("otpValidMinutes", PasswordResetService.OTP_VALID_MINUTES)
        );
    }

    @PostMapping("/verify-reset-otp")
    public ApiResponse<Map<String, String>> verifyOtp(@Valid @RequestBody VerifyOtpRequest req) {
        String token = passwordResetService.verifyOtp(req.email(), req.otp());
        return ApiResponse.success("OTP verified successfully.", Map.of("resetToken", token));
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        passwordResetService.resetPassword(req.resetToken(), req.newPassword());
        return ApiResponse.success("Password updated successfully", null);
    }
}
