package com.businessexchange.user.repository;

import com.businessexchange.user.entity.PasswordChangeOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordChangeOtpRepository extends JpaRepository<PasswordChangeOtp, Long> {

    // Find the most recent unused OTP for a user — verification is done by BCrypt matching in the service
    Optional<PasswordChangeOtp> findFirstByUserIdAndUsedFalseOrderByCreatedAtDesc(Long userId);

    // Delete expired OTPs
    void deleteByExpiresAtBefore(LocalDateTime dateTime);

    // Count OTP generation requests for rate limiting
    long countByUserIdAndCreatedAtAfter(Long userId, LocalDateTime createdAfter);
}
