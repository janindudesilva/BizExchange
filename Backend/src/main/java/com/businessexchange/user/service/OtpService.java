package com.businessexchange.user.service;

import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.user.entity.PasswordChangeOtp;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.repository.PasswordChangeOtpRepository;
import com.businessexchange.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final PasswordChangeOtpRepository otpRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.otp.expiry.minutes:10}")
    private int otpExpiryMinutes;

    @Value("${app.otp.max-attempts:5}")
    private int maxAttempts;

    /**
     * Generate and send OTP to user's email.
     * The OTP is hashed with BCrypt before persistence — plaintext is never stored.
     */
    @Transactional
    public void generateAndSendOtp(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        // Rate-limit: at most maxAttempts OTP requests per hour
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        long recentRequests = otpRepository.countByUserIdAndCreatedAtAfter(user.getId(), oneHourAgo);
        if (recentRequests >= maxAttempts) {
            throw new RuntimeException("Too many OTP requests. Try again after 1 hour.");
        }

        // Generate 6-digit OTP and hash it before storing
        String otpCode = generateOtp();
        String otpHash = passwordEncoder.encode(otpCode);

        PasswordChangeOtp passwordChangeOtp = PasswordChangeOtp.builder()
                .user(user)
                .otpHash(otpHash)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes))
                .used(false)
                .attemptCount(0)
                .build();

        otpRepository.save(passwordChangeOtp);
        log.info("OTP generated and hashed for user: {}", email);

        // Send plaintext OTP only via email — it is never logged or stored
        emailService.sendPasswordChangeOtp(user, otpCode);
        log.info("OTP email sent to: {}", email);
    }

    /**
     * Verify a submitted OTP against the stored BCrypt hash.
     * Increments attempt counter on each call; locks out after maxAttempts failed checks.
     *
     * @return true if the OTP is valid and matches
     */
    @Transactional
    public boolean verifyOtp(String email, String otpCode) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        PasswordChangeOtp otp = otpRepository
                .findFirstByUserIdAndUsedFalseOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new RuntimeException("No active OTP found. Please request a new OTP."));

        // Check expiry first (cheap check before BCrypt)
        if (otp.isExpired()) {
            throw new RuntimeException("OTP has expired. Please request a new OTP.");
        }

        // Enforce brute-force lockout
        if (otp.getAttemptCount() >= maxAttempts) {
            throw new RuntimeException("Too many failed attempts. Please request a new OTP.");
        }

        // Increment attempt counter regardless of outcome
        otp.setAttemptCount(otp.getAttemptCount() + 1);
        otpRepository.save(otp);

        // BCrypt verification
        if (!passwordEncoder.matches(otpCode, otp.getOtpHash())) {
            int remaining = maxAttempts - otp.getAttemptCount();
            log.warn("Invalid OTP attempt for user: {} ({} attempts remaining)", email, remaining);
            throw new RuntimeException("Invalid OTP. " + remaining + " attempt(s) remaining.");
        }

        return true;
    }

    /**
     * Mark OTP as used after the password has been successfully changed.
     */
    @Transactional
    public void markOtpAsUsed(String email, String otpCode) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        PasswordChangeOtp otp = otpRepository
                .findFirstByUserIdAndUsedFalseOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No active OTP found"));

        if (!passwordEncoder.matches(otpCode, otp.getOtpHash())) {
            throw new RuntimeException("OTP mismatch during mark-as-used step");
        }

        otp.setUsed(true);
        otp.setUsedAt(LocalDateTime.now());
        otpRepository.save(otp);
        log.info("OTP marked as used for user: {}", email);
    }

    /**
     * Clean up expired OTPs (run periodically).
     */
    @Transactional
    public void cleanupExpiredOtps() {
        otpRepository.deleteByExpiresAtBefore(LocalDateTime.now());
        log.info("Expired OTPs cleaned up");
    }

    /**
     * Generate a cryptographically random 6-digit OTP string.
     */
    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }
}
