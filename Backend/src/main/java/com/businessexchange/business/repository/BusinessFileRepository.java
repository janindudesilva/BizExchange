package com.businessexchange.business.repository;

import com.businessexchange.business.entity.BusinessFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusinessFileRepository extends JpaRepository<BusinessFile, Long> {
    List<BusinessFile> findByBusinessId(Long businessId);

    @Query("SELECT f FROM BusinessFile f WHERE f.business.seller.id = :sellerId AND f.fileType = 'DOCUMENT'")
    List<BusinessFile> findDocumentsBySellerId(@Param("sellerId") Long sellerId);
}