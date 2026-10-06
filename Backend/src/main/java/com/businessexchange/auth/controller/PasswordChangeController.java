package com.businessexchange.auth.controller;

import com.businessexchange.auth.dto.*;
import com.businessexchange.common.response.ApiResponse;
import com.businessexchange.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/password")
@RequiredArgsConstructor
public class PasswordChangeController {

    private final UserService userService;

    /**
     * Step 1: Request password change
     * Sends OTP to user's email
     */
    @PostMapping("/request-change")
    public ApiResponse<Void> requestPasswordChange(
            @Valid @RequestBody RequestPasswordChangeRequest request) {
        userService.requestPasswordChange(request.getEmail(), request.getCurrentPassword());
        return ApiResponse.success("OTP sent to your email. Valid for 10 minutes.", null);
    }

    /**
     * Step 2: Verify OTP (optional endpoint, for UI to show feedback)
     */
    @PostMapping("/verify-otp")
    public ApiResponse<Void> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request) {
        userService.verifyOtp(request.email(), request.otp());
        return ApiResponse.success("OTP verified successfully. You can now set your new password.", null);
    }

    /**
     * Step 3: Change password with OTP
     * Completes the password change process
     */
    @PostMapping("/change-with-otp")
    public ApiResponse<Void> changePasswordWithOtp(
            @Valid @RequestBody ChangePasswordWithOtpRequest request) {
        
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Passwords do not match");
        }

        userService.changePasswordWithOtp(
                request.getEmail(),
                request.getOtpCode(),
                request.getNewPassword(),
                request.getConfirmPassword()
        );

        return ApiResponse.success("Password changed successfully! You can now login with your new password.", null);
    }
}
