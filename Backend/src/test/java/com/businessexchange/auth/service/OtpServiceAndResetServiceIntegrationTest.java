package com.businessexchange.auth.service;

import com.businessexchange.auth.entity.PasswordResetRequest;
import com.businessexchange.auth.repository.PasswordResetRequestRepository;
import com.businessexchange.user.entity.AccountStatus;
import com.businessexchange.user.entity.PasswordChangeOtp;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.PasswordChangeOtpRepository;
import com.businessexchange.user.repository.UserRepository;
import com.businessexchange.user.service.EmailService;
import com.businessexchange.user.service.OtpService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class OtpServiceAndResetServiceIntegrationTest {

    @Autowired
    private OtpService otpService;

    @Autowired
    private PasswordResetService passwordResetService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordChangeOtpRepository otpRepository;

    @Autowired
    private PasswordResetRequestRepository resetRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private EmailService emailService;

    private User testUser;
    private final String VALID_OTP = "123456";
    private final String WRONG_OTP = "999999";

    @BeforeEach
    void setUp() {
        otpRepository.deleteAll();
        resetRepository.deleteAll();
        userRepository.deleteAll();

        testUser = userRepository.save(User.builder()
                .email("otp.flow@test.com")
                .fullName("OTP Flow Tester")
                .passwordHash(passwordEncoder.encode("OldPassword123!"))
                .role(UserRole.BUYER)
                .status(AccountStatus.ACTIVE)
                .tokenVersion(1)
                .build());
    }

    @AfterEach
    void tearDown() {
        otpRepository.deleteAll();
        resetRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("Password Change OTP: failed attempts persist, lockout occurs after 5 failures, and valid OTP succeeds")
    void testPasswordChangeOtpFlowWithPersistenceAndLockout() {
        // Seed an active PasswordChangeOtp with hash of VALID_OTP
        PasswordChangeOtp otp = otpRepository.save(PasswordChangeOtp.builder()
                .user(testUser)
                .otpHash(passwordEncoder.encode(VALID_OTP))
                .attemptCount(0)
                .used(false)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build());

        // Attempt 1: wrong OTP -> throws exception, attemptCount becomes 1
        assertThrows(RuntimeException.class, () -> otpService.verifyOtp(testUser.getEmail(), WRONG_OTP));
        PasswordChangeOtp afterAttempt1 = otpRepository.findById(otp.getId()).orElseThrow();
        assertEquals(1, afterAttempt1.getAttemptCount(), "Failed attempt must commit to DB");

        // Attempt 2: wrong OTP -> throws exception, attemptCount becomes 2
        assertThrows(RuntimeException.class, () -> otpService.verifyOtp(testUser.getEmail(), WRONG_OTP));
        PasswordChangeOtp afterAttempt2 = otpRepository.findById(otp.getId()).orElseThrow();
        assertEquals(2, afterAttempt2.getAttemptCount());

        // Attempt 3: valid OTP -> succeeds!
        boolean valid = otpService.verifyOtp(testUser.getEmail(), VALID_OTP);
        assertTrue(valid);

        // Mark OTP as used -> preserves attempt count at 2, marks used = true
        otpService.markOtpAsUsed(testUser.getEmail(), VALID_OTP);
        PasswordChangeOtp consumedOtp = otpRepository.findById(otp.getId()).orElseThrow();
        assertTrue(consumedOtp.getUsed());
        assertEquals(2, consumedOtp.getAttemptCount(), "Consuming OTP must not overwrite or reset attemptCount");
    }

    @Test
    @DisplayName("Password Change OTP: lockout triggers after 5 failed attempts")
    void testPasswordChangeOtpLockoutAfterMaxAttempts() {
        PasswordChangeOtp otp = otpRepository.save(PasswordChangeOtp.builder()
                .user(testUser)
                .otpHash(passwordEncoder.encode(VALID_OTP))
                .attemptCount(0)
                .used(false)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build());

        for (int i = 1; i <= 5; i++) {
            assertThrows(RuntimeException.class, () -> otpService.verifyOtp(testUser.getEmail(), WRONG_OTP));
        }

        PasswordChangeOtp lockedOtp = otpRepository.findById(otp.getId()).orElseThrow();
        assertEquals(5, lockedOtp.getAttemptCount());

        // 6th attempt with correct OTP must still be rejected due to lockout
        RuntimeException ex = assertThrows(RuntimeException.class, () -> otpService.verifyOtp(testUser.getEmail(), VALID_OTP));
        assertTrue(ex.getMessage().contains("Too many failed attempts"));
    }

    @Test
    @DisplayName("Password Reset: failed attempts persist, concurrent attempts increment atomically, and correct OTP generates token")
    void testPasswordResetFlowWithConcurrentAttempts() throws Exception {
        PasswordResetRequest request = new PasswordResetRequest();
        request.setUserId(testUser.getId());
        request.setOtpHash(passwordEncoder.encode(VALID_OTP));
        request.setOtpExpiresAt(LocalDateTime.now().plusMinutes(10));
        request.setAttemptCount(0);
        request.setUsed(false);
        request = resetRepository.save(request);
        UUID requestId = request.getId();

        // Run 3 concurrent failed attempts
        int threadCount = 3;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        List<Callable<Void>> tasks = new ArrayList<>();
        for (int i = 0; i < threadCount; i++) {
            tasks.add(() -> {
                try {
                    passwordResetService.verifyOtp(testUser.getEmail(), WRONG_OTP);
                } catch (BadCredentialsException ignored) {
                }
                return null;
            });
        }
        List<Future<Void>> futures = executor.invokeAll(tasks);
        for (Future<Void> f : futures) {
            f.get();
        }
        executor.shutdown();

        // Verify that all 3 increments persisted atomically without lock conflicts
        PasswordResetRequest afterConcurrent = resetRepository.findById(requestId).orElseThrow();
        assertEquals(3, afterConcurrent.getAttemptCount(), "Concurrent failed attempts must increment count to 3");

        // Now submit valid OTP on attempt 4
        String resetToken = passwordResetService.verifyOtp(testUser.getEmail(), VALID_OTP);
        assertNotNull(resetToken);

        PasswordResetRequest verifiedRequest = resetRepository.findById(requestId).orElseThrow();
        assertTrue(verifiedRequest.isVerified());
        assertEquals(3, verifiedRequest.getAttemptCount(), "Successful verification preserves attempt count");
        assertEquals(resetToken, verifiedRequest.getResetToken());

        // Perform password reset with token
        passwordResetService.resetPassword(resetToken, "BrandNewPassword123!");

        // Verify password updated, token_version incremented to 2, and request marked used
        User reloadedUser = userRepository.findById(testUser.getId()).orElseThrow();
        assertTrue(passwordEncoder.matches("BrandNewPassword123!", reloadedUser.getPasswordHash()));
        assertEquals(2, reloadedUser.getTokenVersion(), "Password reset must increment token_version for session revocation");

        PasswordResetRequest consumed = resetRepository.findById(requestId).orElseThrow();
        assertTrue(consumed.isUsed());
    }
}
