package com.businessexchange.user.service;

import com.businessexchange.auth.entity.PasswordResetRequest;
import com.businessexchange.auth.repository.PasswordResetRequestRepository;
import com.businessexchange.user.entity.PasswordChangeOtp;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.PasswordChangeOtpRepository;
import com.businessexchange.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(OtpAttemptService.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class OtpAttemptPersistenceIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordChangeOtpRepository passwordChangeOtpRepository;

    @Autowired
    private PasswordResetRequestRepository passwordResetRequestRepository;

    @Autowired
    private OtpAttemptService otpAttemptService;

    @AfterEach
    void tearDown() {
        passwordChangeOtpRepository.deleteAll();
        passwordResetRequestRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("TASK 5: DB-backed failed attempt counter increments and commits independently")
    void testPasswordChangeOtpFailedAttemptPersistence() {
        // Step 1: Create user and OTP record with 0 attempts
        User user = User.builder()
                .email("test.otp@bizexchange.local")
                .fullName("OTP Tester")
                .passwordHash("$2a$10$dummyhashedpassword1234567890123456789012")
                .role(UserRole.BUYER)
                .tokenVersion(0)
                .build();
        user = userRepository.save(user);

        PasswordChangeOtp otp = PasswordChangeOtp.builder()
                .user(user)
                .otpHash("dummy_hash")
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .attemptCount(0)
                .used(false)
                .build();
        otp = passwordChangeOtpRepository.save(otp);
        Long otpId = otp.getId();

        // Step 2: Trigger failed attempt increments via OtpAttemptService
        int countAfterFirst = otpAttemptService.incrementPasswordChangeOtpAttempt(otpId);
        assertEquals(1, countAfterFirst);

        int countAfterSecond = otpAttemptService.incrementPasswordChangeOtpAttempt(otpId);
        assertEquals(2, countAfterSecond);

        // Step 3: Reload directly from database to verify persistence
        PasswordChangeOtp reloadedOtp = passwordChangeOtpRepository.findById(otpId).orElseThrow();
        assertEquals(2, reloadedOtp.getAttemptCount(), "Database must reflect incremented attempt count");
        assertFalse(reloadedOtp.getUsed());
    }

    @Test
    @DisplayName("TASK 5: PasswordResetRequest failed attempts persist at database level")
    void testPasswordResetRequestFailedAttemptPersistence() {
        User user = User.builder()
                .email("reset.otp@bizexchange.local")
                .fullName("Reset Tester")
                .passwordHash("$2a$10$dummyhashedpassword1234567890123456789012")
                .role(UserRole.SELLER)
                .tokenVersion(0)
                .build();
        user = userRepository.save(user);

        PasswordResetRequest resetRequest = new PasswordResetRequest();
        resetRequest.setUserId(user.getId());
        resetRequest.setOtpHash("hash_val");
        resetRequest.setOtpExpiresAt(LocalDateTime.now().plusMinutes(5));
        resetRequest.setAttemptCount(0);
        resetRequest.setUsed(false);
        resetRequest = passwordResetRequestRepository.save(resetRequest);
        UUID requestId = resetRequest.getId();

        int firstCount = otpAttemptService.incrementPasswordResetOtpAttempt(requestId);
        assertEquals(1, firstCount);

        int secondCount = otpAttemptService.incrementPasswordResetOtpAttempt(requestId);
        assertEquals(2, secondCount);

        PasswordResetRequest reloaded = passwordResetRequestRepository.findById(requestId).orElseThrow();
        assertEquals(2, reloaded.getAttemptCount());
    }

    @Test
    @DisplayName("TASK 5: Expired and used OTPs are recognized as invalid and cannot be reused")
    void testExpiredAndUsedOtpInvalidation() {
        PasswordChangeOtp expiredOtp = PasswordChangeOtp.builder()
                .otpHash("dummy")
                .createdAt(LocalDateTime.now().minusMinutes(20))
                .expiresAt(LocalDateTime.now().minusMinutes(10))
                .used(false)
                .attemptCount(0)
                .build();

        assertTrue(expiredOtp.isExpired(), "OTP past expiration timestamp must report expired");
        assertFalse(expiredOtp.isValid(), "Expired OTP must not be valid");

        PasswordChangeOtp usedOtp = PasswordChangeOtp.builder()
                .otpHash("dummy")
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .used(true)
                .attemptCount(0)
                .build();

        assertFalse(usedOtp.isValid(), "Already-used OTP must not be valid for reuse");
    }
}
