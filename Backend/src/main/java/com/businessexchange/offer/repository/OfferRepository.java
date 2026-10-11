package com.businessexchange.offer.repository;

import com.businessexchange.offer.entity.Offer;
import com.businessexchange.offer.entity.OfferStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OfferRepository extends JpaRepository<Offer, Long> {

    @EntityGraph(attributePaths = {"business", "buyer", "seller", "inquiry"})
    Optional<Offer> findById(Long id);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT o FROM Offer o WHERE o.id = :id")
    Optional<Offer> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);

    boolean existsByBusinessIdAndBuyerIdAndStatus(Long businessId, Long buyerId, OfferStatus status);

    @EntityGraph(attributePaths = {"business", "seller"})
    List<Offer> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);

    @EntityGraph(attributePaths = {"business", "buyer"})
    List<Offer> findBySellerIdOrderByCreatedAtDesc(Long sellerId);

    @EntityGraph(attributePaths = {"business", "buyer", "seller"})
    List<Offer> findByBusinessIdOrderByCreatedAtDesc(Long businessId);

    @EntityGraph(attributePaths = {"business", "buyer", "seller"})
    List<Offer> findByInquiryIdOrderByCreatedAtDesc(Long inquiryId);

    List<Offer> findByBusinessIdAndStatusAndIdNot(Long businessId, OfferStatus status, Long id);

    @EntityGraph(attributePaths = {"business", "buyer", "seller"})
    List<Offer> findAllByOrderByCreatedAtDesc();

    long countByStatus(OfferStatus status);
}
