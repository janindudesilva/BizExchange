package com.businessexchange.favorite.repository;

import com.businessexchange.favorite.entity.SavedBusiness;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedBusinessRepository extends JpaRepository<SavedBusiness, Long> {
    Optional<SavedBusiness> findByBuyerIdAndBusinessId(Long buyerId, Long businessId);
    List<SavedBusiness> findByBuyerIdOrderBySavedAtDesc(Long buyerId);
    void deleteByBuyerIdAndBusinessId(Long buyerId, Long businessId);
    boolean existsByBuyerIdAndBusinessId(Long buyerId, Long businessId);
}
