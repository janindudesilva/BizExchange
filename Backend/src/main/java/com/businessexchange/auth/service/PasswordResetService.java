package com.businessexchange.auth.service;

import com.businessexchange.auth.entity.PasswordResetRequest;
import com.businessexchange.auth.repository.PasswordResetRequestRepository;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.repository.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class PasswordResetService {

    public static final int OTP_VALID_MINUTES = 5;
    private static final int OTP_LENGTH = 6;
    private static final int MAX_ATTEMPTS = 5;
    private static final int RESET_TOKEN_VALID_MINUTES = 15;
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    private final UserRepository userRepository;
    private final PasswordResetRequestRepository resetRepository;
    private final ResendEmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final com.businessexchange.user.service.OtpAttemptService otpAttemptService;
    private final SecureRandom secureRandom = new SecureRandom();

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetRequestRepository resetRepository,
            ResendEmailService emailService,
            PasswordEncoder passwordEncoder,
            com.businessexchange.user.service.OtpAttemptService otpAttemptService) {
        this.userRepository = userRepository;
        this.resetRepository = resetRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
        this.otpAttemptService = otpAttemptService;
    }

    @Transactional
    public void requestReset(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);

        // Always behave the same way whether or not the account exists
        if (userOpt.isEmpty()) {
            return;
        }

        User user = userOpt.get();

        // Rate limiting: enforce cooldown between OTP requests for the same user
        Optional<PasswordResetRequest> lastRequest =
                resetRepository.findTopByUserIdOrderByCreatedAtDesc(user.getId());
        if (lastRequest.isPresent()) {
            LocalDateTime cooldownEnds = lastRequest.get().getCreatedAt()
                    .plusSeconds(RESEND_COOLDOWN_SECONDS);
            if (cooldownEnds.isAfter(LocalDateTime.now())) {
                return; // silently no-op to avoid leaking timing info
            }
        }

        String otp = generateOtp();
        String otpHash = passwordEncoder.encode(otp); // reuse BCrypt for OTP hashing too

        PasswordResetRequest reset = new PasswordResetRequest();
        reset.setUserId(user.getId());
        reset.setOtpHash(otpHash);
        reset.setOtpExpiresAt(LocalDateTime.now().plusMinutes(OTP_VALID_MINUTES));
        resetRepository.save(reset);

        emailService.sendOtp(user.getEmail(), otp);
    }

    @Transactional
    public String verifyOtp(String email, String otp) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid code"));

        PasswordResetRequest reset = resetRepository
                .findTopByUserIdOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new BadCredentialsException("Invalid code"));

        if (reset.isUsed()) {
            throw new BadCredentialsException("Code has already been used. Please request a new code.");
        }
        if (reset.getAttemptCount() >= MAX_ATTEMPTS) {
            throw new BadCredentialsException("Too many failed attempts. Please request a new code.");
        }
        if (reset.getOtpExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadCredentialsException("Code has expired. Please request a new code.");
        }

        if (!passwordEncoder.matches(otp, reset.getOtpHash())) {
            // Commit incremented attempt count in an isolated transaction so it persists on failure
            int currentAttempts = otpAttemptService.incrementPasswordResetOtpAttempt(reset.getId());
            int remaining = MAX_ATTEMPTS - currentAttempts;
            if (remaining <= 0) {
                throw new BadCredentialsException("Too many failed attempts. Please request a new code.");
            }
            throw new BadCredentialsException("Invalid code. " + remaining + " attempt(s) remaining.");
        }

        reset.setVerified(true);
        String token = UUID.randomUUID().toString();
        reset.setResetToken(token);
        reset.setResetTokenExpiresAt(LocalDateTime.now().plusMinutes(RESET_TOKEN_VALID_MINUTES));
        resetRepository.save(reset);

        return token;
    }

    @Transactional
    public void resetPassword(String resetToken, String newPassword) {
        PasswordResetRequest reset = resetRepository.findByResetToken(resetToken)
                .orElseThrow(() -> new BadCredentialsException("Invalid or expired token"));

        if (reset.isUsed()
                || !reset.isVerified()
                || reset.getResetTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadCredentialsException("Invalid or expired token");
        }

        User user = userRepository.findById(reset.getUserId())
                .orElseThrow(() -> new IllegalStateException("User not found"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setTokenVersion((user.getTokenVersion() != null ? user.getTokenVersion() : 1) + 1);
        userRepository.save(user);

        reset.setUsed(true);
        resetRepository.save(reset);
    }

    private String generateOtp() {
        int otp = secureRandom.nextInt((int) Math.pow(10, OTP_LENGTH));
        return String.format("%0" + OTP_LENGTH + "d", otp);
    }
}
