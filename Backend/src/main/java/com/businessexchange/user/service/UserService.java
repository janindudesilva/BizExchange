package com.businessexchange.user.service;

import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.support.dto.LimitedUserView;
import com.businessexchange.user.dto.ChangePasswordRequest;
import com.businessexchange.user.dto.UpdateProfileRequest;
import com.businessexchange.user.dto.UserResponse;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;
    private final EmailService emailService;

    public UserResponse getUserProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return mapToResponse(user);
    }

    @Transactional
    public UserResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setFullName(request.getFullName());
        user.setPhone(request.getPhone());
        User saved = userRepository.save(user);

        return mapToResponse(saved);
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Incorrect old password");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    /**
     * Request password change - generates and sends OTP
     */
    @Transactional
    public void requestPasswordChange(String email, String currentPassword) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        // Unconditionally verify current password
        if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            log.warn("Password change attempt with wrong current password for user: {}", email);
            throw new org.springframework.security.authentication.BadCredentialsException("Current password is incorrect");
        }

        // Generate and send OTP
        otpService.generateAndSendOtp(email);
        log.info("Password change OTP sent to: {}", email);
    }

    /**
     * Verify OTP status
     */
    @Transactional(readOnly = true)
    public boolean verifyOtp(String email, String otpCode) {
        return otpService.verifyOtp(email, otpCode);
    }

    /**
     * Change password with OTP verification
     */
    @Transactional
    public void changePasswordWithOtp(String email, String otpCode, String newPassword, String confirmPassword) {
        // Verify OTP
        if (!otpService.verifyOtp(email, otpCode)) {
            throw new RuntimeException("Invalid OTP");
        }

        // Verify passwords match
        if (!newPassword.equals(confirmPassword)) {
            throw new RuntimeException("Passwords do not match");
        }

        // Validate password strength
        if (newPassword.length() < 8) {
            throw new RuntimeException("Password must be at least 8 characters");
        }

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Update password
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("Password changed successfully for user: {}", email);

        // Mark OTP as used
        otpService.markOtpAsUsed(email, otpCode);

        // Send confirmation email
        sendPasswordChangeConfirmationEmail(user);
    }

    /**
     * Send confirmation email after password change
     */
    private void sendPasswordChangeConfirmationEmail(User user) {
        String htmlContent = """
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f3f4f6; padding: 20px; border-radius: 0 0 5px 5px; }
                    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✓ Password Changed Successfully</h1>
                    </div>
                    <div class="content">
                        <p>Hi %s,</p>
                        <p>Your password has been changed successfully.</p>
                        <p>If you didn't make this change, please contact our support team immediately.</p>
                        <p>Best regards,<br>The BizExchange Team</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2026 BizExchange. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(user.getFullName() != null ? user.getFullName() : "User");

        emailService.sendNotificationEmail(user.getEmail(), "Password Changed", htmlContent);
    }

    private UserResponse mapToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .status(user.getStatus().name())
                .emailVerified(user.getEmailVerified())
                .build();
    }

    public LimitedUserView getLimitedView(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return LimitedUserView.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .build();
    }
}
