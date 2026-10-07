package com.businessexchange.inquiry.repository;

import com.businessexchange.inquiry.entity.Inquiry;
import com.businessexchange.inquiry.entity.InquiryStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface InquiryRepository extends JpaRepository<Inquiry, Long> {

    @EntityGraph(attributePaths = {"business", "buyer", "seller"})
    List<Inquiry> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);

    @EntityGraph(attributePaths = {"business", "buyer", "seller"})
    List<Inquiry> findBySellerIdOrderByCreatedAtDesc(Long sellerId);

    @EntityGraph(attributePaths = {"business", "buyer", "seller"})
    List<Inquiry> findByBusinessIdAndBuyerId(Long businessId, Long buyerId);

    @EntityGraph(attributePaths = {"business", "buyer", "seller"})
    List<Inquiry> findByBusinessIdAndBuyerIdAndStatusIn(Long businessId, Long buyerId, Collection<InquiryStatus> statuses);

    boolean existsByBusinessIdAndBuyerIdAndStatusIn(Long businessId, Long buyerId, Collection<InquiryStatus> statuses);

    @EntityGraph(attributePaths = {"business", "buyer", "seller"})
    List<Inquiry> findByBuyerIdAndSellerId(Long buyerId, Long sellerId);

    @EntityGraph(attributePaths = {"business", "buyer", "seller"})
    Optional<Inquiry> findById(Long id);

    long countByStatus(InquiryStatus status);
}
