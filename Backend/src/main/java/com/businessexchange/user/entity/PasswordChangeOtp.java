package com.businessexchange.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "password_change_otps", indexes = {
    @Index(name = "idx_user_id", columnList = "user_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordChangeOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "otp_hash", nullable = false, length = 72)
    private String otpHash;  // BCrypt hash of the 6-digit OTP — never stored in plaintext

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    @Builder.Default
    private Boolean used = false;  // Track if OTP was already used

    @Column
    private LocalDateTime usedAt;  // When OTP was used

    @Column(nullable = false)
    @Builder.Default
    private int attemptCount = 0;  // Incremented on each failed verify attempt; prevents brute force

    // Helper method to check if OTP is valid
    public boolean isValid() {
        return !Boolean.TRUE.equals(used) && LocalDateTime.now().isBefore(expiresAt);
    }

    // Helper method to check if OTP is expired
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}
