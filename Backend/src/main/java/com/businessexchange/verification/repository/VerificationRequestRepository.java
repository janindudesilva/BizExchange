package com.businessexchange.verification.repository;

import com.businessexchange.verification.entity.VerificationRequest;
import com.businessexchange.seller.entity.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VerificationRequestRepository extends JpaRepository<VerificationRequest, Long> {

    List<VerificationRequest> findByStatusOrderByCreatedAtAsc(VerificationStatus status);

    List<VerificationRequest> findByOfficerIdOrderByCreatedAtDesc(Long officerId);

    Optional<VerificationRequest> findByBusinessId(Long businessId);

    List<VerificationRequest> findAllByOrderByCreatedAtDesc();
}
