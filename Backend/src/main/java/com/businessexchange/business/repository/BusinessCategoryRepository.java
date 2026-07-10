package com.businessexchange.business.repository;

import com.businessexchange.business.entity.BusinessCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BusinessCategoryRepository extends JpaRepository<BusinessCategory, Long> {
    Optional<BusinessCategory> findByName(String name);
}