package com.businessexchange.business.repository;

import com.businessexchange.business.entity.BusinessFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusinessFileRepository extends JpaRepository<BusinessFile, Long> {
    List<BusinessFile> findByBusinessId(Long businessId);
}