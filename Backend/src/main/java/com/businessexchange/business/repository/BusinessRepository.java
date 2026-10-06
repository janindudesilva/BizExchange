package com.businessexchange.business.repository;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessRepository extends JpaRepository<Business, Long>, JpaSpecificationExecutor<Business> {
    @Override
    @EntityGraph(attributePaths = {"seller", "category"})
    Optional<Business> findById(Long id);

    @Override
    @EntityGraph(attributePaths = {"seller", "category"})
    Page<Business> findAll(Specification<Business> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"seller", "category"})
    List<Business> findByStatus(BusinessStatus status);

    @EntityGraph(attributePaths = {"seller", "category"})
    Page<Business> findByStatus(BusinessStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"seller", "category"})
    List<Business> findBySellerId(Long sellerId);

    @EntityGraph(attributePaths = {"seller", "category"})
    Page<Business> findBySellerId(Long sellerId, Pageable pageable);

    boolean existsByCategoryId(Long categoryId);
    long countByStatus(BusinessStatus status);
}
