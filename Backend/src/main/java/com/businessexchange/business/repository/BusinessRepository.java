package com.businessexchange.business.repository;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusinessRepository extends JpaRepository<Business, Long> {
    List<Business> findByStatus(BusinessStatus status);
    List<Business> findBySellerId(Long sellerId);
}
