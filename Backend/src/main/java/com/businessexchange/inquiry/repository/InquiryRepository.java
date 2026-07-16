package com.businessexchange.inquiry.repository;

import com.businessexchange.inquiry.entity.Inquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InquiryRepository extends JpaRepository<Inquiry, Long> {
    List<Inquiry> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);
    List<Inquiry> findBySellerIdOrderByCreatedAtDesc(Long sellerId);
    Optional<Inquiry> findByBusinessIdAndBuyerId(Long businessId, Long buyerId);
}
