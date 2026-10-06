package com.businessexchange.auth.repository;

import com.businessexchange.auth.entity.PasswordResetOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, UUID> {

    Optional<PasswordResetOtp> findTopByEmailAndUsedFalseOrderByExpiresAtDesc(String email);

    void deleteByExpiresAtBefore(LocalDateTime dateTime);

    long countByEmailAndCreatedAtAfter(String email, LocalDateTime createdAfter);
}
