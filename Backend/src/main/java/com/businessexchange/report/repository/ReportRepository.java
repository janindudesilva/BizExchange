package com.businessexchange.report.repository;

import com.businessexchange.report.entity.Report;
import com.businessexchange.report.entity.ReportCategory;
import com.businessexchange.report.entity.ReportStatus;
import com.businessexchange.report.entity.ReportTargetType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {

    List<Report> findByReporterIdOrderByCreatedAtDesc(Long reporterId);

    List<Report> findByReporterIdAndStatusOrderByCreatedAtDesc(Long reporterId, ReportStatus status);

    List<Report> findAllByOrderByCreatedAtDesc();

    List<Report> findByStatusOrderByCreatedAtDesc(ReportStatus status);

    List<Report> findByTargetTypeOrderByCreatedAtDesc(ReportTargetType targetType);

    List<Report> findByStatusAndTargetTypeOrderByCreatedAtDesc(ReportStatus status, ReportTargetType targetType);

    List<Report> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(ReportTargetType targetType, Long targetId);

    boolean existsByReporterIdAndTargetTypeAndTargetIdAndStatusIn(
            Long reporterId,
            ReportTargetType targetType,
            Long targetId,
            Collection<ReportStatus> statuses
    );

    long countByStatus(ReportStatus status);
}
