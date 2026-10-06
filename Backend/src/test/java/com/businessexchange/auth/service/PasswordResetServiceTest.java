package com.businessexchange.auth.service;

import com.businessexchange.auth.entity.PasswordResetRequest;
import com.businessexchange.auth.repository.PasswordResetRequestRepository;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetRequestRepository resetRepository;

    @Mock
    private ResendEmailService emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private PasswordResetService passwordResetService;

    private User sampleUser;
    private PasswordResetRequest sampleRequest;

    @BeforeEach
    void setUp() {
        sampleUser = new User();
        sampleUser.setId(1L);
        sampleUser.setEmail("test@bizexchange.com");

        sampleRequest = new PasswordResetRequest();
        sampleRequest.setId(java.util.UUID.randomUUID());
        sampleRequest.setUserId(1L);
        sampleRequest.setOtpHash("encoded_hash");
        sampleRequest.setOtpExpiresAt(LocalDateTime.now().plusMinutes(5));
        sampleRequest.setAttemptCount(0);
        sampleRequest.setUsed(false);
    }

    @Test
    @DisplayName("requestReset should quietly return without error if user does not exist")
    void requestReset_unknownUser_shouldNoOp() {
        when(userRepository.findByEmail("unknown@bizexchange.com")).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> passwordResetService.requestReset("unknown@bizexchange.com"));
        verify(resetRepository, never()).save(any());
        verify(emailService, never()).sendOtp(any(), any());
    }

    @Test
    @DisplayName("verifyOtp should increment attempt count and throw BadCredentialsException on wrong code")
    void verifyOtp_wrongCode_shouldIncrementAttemptsAndThrow() {
        when(userRepository.findByEmail("test@bizexchange.com")).thenReturn(Optional.of(sampleUser));
        when(resetRepository.findTopByUserIdOrderByCreatedAtDesc(1L)).thenReturn(Optional.of(sampleRequest));
        when(passwordEncoder.matches("999999", "encoded_hash")).thenReturn(false);

        BadCredentialsException ex = assertThrows(BadCredentialsException.class, () ->
                passwordResetService.verifyOtp("test@bizexchange.com", "999999"));

        assertEquals("Invalid code", ex.getMessage());
        assertEquals(1, sampleRequest.getAttemptCount());
        verify(resetRepository).save(sampleRequest);
    }

    @Test
    @DisplayName("verifyOtp should lock out after max failed attempts")
    void verifyOtp_maxAttempts_shouldLockOut() {
        sampleRequest.setAttemptCount(5);
        when(userRepository.findByEmail("test@bizexchange.com")).thenReturn(Optional.of(sampleUser));
        when(resetRepository.findTopByUserIdOrderByCreatedAtDesc(1L)).thenReturn(Optional.of(sampleRequest));

        BadCredentialsException ex = assertThrows(BadCredentialsException.class, () ->
                passwordResetService.verifyOtp("test@bizexchange.com", "123456"));

        assertEquals("Too many attempts", ex.getMessage());
        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    @DisplayName("verifyOtp with valid code should return reset token")
    void verifyOtp_validCode_shouldReturnToken() {
        when(userRepository.findByEmail("test@bizexchange.com")).thenReturn(Optional.of(sampleUser));
        when(resetRepository.findTopByUserIdOrderByCreatedAtDesc(1L)).thenReturn(Optional.of(sampleRequest));
        when(passwordEncoder.matches("123456", "encoded_hash")).thenReturn(true);

        String token = passwordResetService.verifyOtp("test@bizexchange.com", "123456");

        assertNotNull(token);
        assertTrue(sampleRequest.isVerified());
        assertNotNull(sampleRequest.getResetToken());
        verify(resetRepository).save(sampleRequest);
    }
}
