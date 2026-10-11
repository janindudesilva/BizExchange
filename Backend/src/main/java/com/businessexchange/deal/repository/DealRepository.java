package com.businessexchange.deal.repository;

import com.businessexchange.deal.entity.Deal;
import com.businessexchange.deal.entity.DealStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface DealRepository extends JpaRepository<Deal, Long> {

    @EntityGraph(attributePaths = {"business", "buyer", "seller", "offer", "cancellationRequestedBy"})
    Optional<Deal> findById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Deal d WHERE d.id = :id")
    Optional<Deal> findByIdForUpdate(@Param("id") Long id);

    @EntityGraph(attributePaths = {"business", "buyer", "seller", "offer", "cancellationRequestedBy"})
    Optional<Deal> findByOfferId(Long offerId);

    boolean existsByBusinessIdAndStatus(Long businessId, DealStatus status);

    boolean existsByBuyerIdAndSellerIdAndStatus(Long buyerId, Long sellerId, DealStatus status);

    Optional<Deal> findFirstByBuyerIdAndSellerIdAndStatusOrderByClosedAtDesc(Long buyerId, Long sellerId, DealStatus status);

    @EntityGraph(attributePaths = {"business", "buyer", "seller", "offer", "cancellationRequestedBy"})
    List<Deal> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);

    @EntityGraph(attributePaths = {"business", "buyer", "seller", "offer", "cancellationRequestedBy"})
    List<Deal> findBySellerIdOrderByCreatedAtDesc(Long sellerId);

    @EntityGraph(attributePaths = {"business", "buyer", "seller", "offer", "cancellationRequestedBy"})
    List<Deal> findByBusinessIdOrderByCreatedAtDesc(Long businessId);

    @EntityGraph(attributePaths = {"business", "buyer", "seller", "offer", "cancellationRequestedBy"})
    List<Deal> findAllByOrderByCreatedAtDesc();

    long countByStatus(DealStatus status);
}
