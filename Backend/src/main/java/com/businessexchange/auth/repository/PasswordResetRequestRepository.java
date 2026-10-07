package com.businessexchange.auth.repository;

import com.businessexchange.auth.entity.PasswordResetRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, UUID> {

    Optional<PasswordResetRequest> findTopByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<PasswordResetRequest> findByResetToken(String resetToken);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query("UPDATE PasswordResetRequest r SET r.attemptCount = r.attemptCount + 1 WHERE r.id = :id")
    int incrementAttempts(@org.springframework.data.repository.query.Param("id") UUID id);
}
