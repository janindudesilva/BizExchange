package com.businessexchange.user.service;

import com.businessexchange.user.entity.PasswordChangeOtp;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.repository.PasswordChangeOtpRepository;
import com.businessexchange.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OtpServiceTest {

    @Mock
    private PasswordChangeOtpRepository otpRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailService emailService;

    // Use a real BCrypt encoder for verification tests
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @InjectMocks
    private OtpService otpService;

    private User testUser;

    @BeforeEach
    void setUp() {
        // Inject real encoder and field values since @Value is not processed in unit tests
        ReflectionTestUtils.setField(otpService, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(otpService, "otpExpiryMinutes", 10);
        ReflectionTestUtils.setField(otpService, "maxAttempts", 5);

        testUser = User.builder()
                .id(1L)
                .email("user@test.com")
                .fullName("Test User")
                .build();
    }

    @Test
    @DisplayName("generateAndSendOtp: saves a BCrypt hash, never stores plaintext OTP")
    void generateAndSendOtp_savesBcryptHash_notPlaintext() {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(testUser));
        when(otpRepository.countByUserIdAndCreatedAtAfter(eq(1L), any())).thenReturn(0L);

        ArgumentCaptor<PasswordChangeOtp> captor = ArgumentCaptor.forClass(PasswordChangeOtp.class);
        when(otpRepository.save(captor.capture())).thenAnswer(i -> i.getArgument(0));

        otpService.generateAndSendOtp("user@test.com");

        PasswordChangeOtp saved = captor.getValue();
        // Hash must not be the plaintext 6-digit string (BCrypt hashes start with $2a$)
        assertThat(saved.getOtpHash()).startsWith("$2a$");
        assertThat(saved.getOtpHash()).hasSizeGreaterThan(10);
        assertThat(saved.getAttemptCount()).isEqualTo(0);
        assertThat(saved.getUsed()).isFalse();
    }

    @Test
    @DisplayName("verifyOtp: increments attemptCount on each call")
    void verifyOtp_incrementsAttemptCount() {
        String rawOtp = "123456";
        String hash = passwordEncoder.encode(rawOtp);

        PasswordChangeOtp otp = PasswordChangeOtp.builder()
                .id(10L)
                .user(testUser)
                .otpHash(hash)
                .createdAt(LocalDateTime.now().minusMinutes(1))
                .expiresAt(LocalDateTime.now().plusMinutes(9))
                .used(false)
                .attemptCount(0)
                .build();

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(testUser));
        when(otpRepository.findFirstByUserIdAndUsedFalseOrderByCreatedAtDesc(1L)).thenReturn(Optional.of(otp));
        when(otpRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        boolean result = otpService.verifyOtp("user@test.com", rawOtp);

        assertThat(result).isTrue();
        assertThat(otp.getAttemptCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("verifyOtp: throws on wrong OTP and still increments counter")
    void verifyOtp_wrongOtp_throwsAndIncrementsCounter() {
        String correctOtp = "654321";
        String hash = passwordEncoder.encode(correctOtp);

        PasswordChangeOtp otp = PasswordChangeOtp.builder()
                .id(11L)
                .user(testUser)
                .otpHash(hash)
                .createdAt(LocalDateTime.now().minusMinutes(1))
                .expiresAt(LocalDateTime.now().plusMinutes(9))
                .used(false)
                .attemptCount(0)
                .build();

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(testUser));
        when(otpRepository.findFirstByUserIdAndUsedFalseOrderByCreatedAtDesc(1L)).thenReturn(Optional.of(otp));
        when(otpRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        assertThatThrownBy(() -> otpService.verifyOtp("user@test.com", "000000"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invalid OTP");

        // Counter must still be incremented even on failure
        assertThat(otp.getAttemptCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("verifyOtp: throws lockout error after maxAttempts failed checks")
    void verifyOtp_locksOutAfterMaxAttempts() {
        String hash = passwordEncoder.encode("999999");

        PasswordChangeOtp otp = PasswordChangeOtp.builder()
                .id(12L)
                .user(testUser)
                .otpHash(hash)
                .createdAt(LocalDateTime.now().minusMinutes(1))
                .expiresAt(LocalDateTime.now().plusMinutes(9))
                .used(false)
                .attemptCount(5)  // Already at max
                .build();

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(testUser));
        when(otpRepository.findFirstByUserIdAndUsedFalseOrderByCreatedAtDesc(1L)).thenReturn(Optional.of(otp));

        assertThatThrownBy(() -> otpService.verifyOtp("user@test.com", "999999"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Too many failed attempts");

        // Should not attempt BCrypt match or save — locked out immediately
        verify(otpRepository, never()).save(any());
    }

    @Test
    @DisplayName("verifyOtp: throws on expired OTP")
    void verifyOtp_throwsOnExpiredOtp() {
        String hash = passwordEncoder.encode("111111");

        PasswordChangeOtp otp = PasswordChangeOtp.builder()
                .id(13L)
                .user(testUser)
                .otpHash(hash)
                .createdAt(LocalDateTime.now().minusMinutes(20))
                .expiresAt(LocalDateTime.now().minusMinutes(10))  // expired
                .used(false)
                .attemptCount(0)
                .build();

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(testUser));
        when(otpRepository.findFirstByUserIdAndUsedFalseOrderByCreatedAtDesc(1L)).thenReturn(Optional.of(otp));

        assertThatThrownBy(() -> otpService.verifyOtp("user@test.com", "111111"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("expired");
    }
}
