package com.businessexchange.inquiry.repository;

import com.businessexchange.inquiry.entity.Inquiry;
import com.businessexchange.inquiry.entity.InquiryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InquiryRepository extends JpaRepository<Inquiry, Long> {

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"business", "buyer", "seller"})
    List<Inquiry> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"business", "buyer", "seller"})
    List<Inquiry> findBySellerIdOrderByCreatedAtDesc(Long sellerId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"business", "buyer", "seller"})
    Optional<Inquiry> findByBusinessIdAndBuyerId(Long businessId, Long buyerId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"business", "buyer", "seller"})
    List<Inquiry> findByBuyerIdAndSellerId(Long buyerId, Long sellerId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"business", "buyer", "seller"})
    java.util.Optional<Inquiry> findById(Long id);

    long countByStatus(InquiryStatus status);
}
