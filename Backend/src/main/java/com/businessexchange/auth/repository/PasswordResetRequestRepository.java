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
}
