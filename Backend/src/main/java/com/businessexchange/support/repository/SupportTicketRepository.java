package com.businessexchange.support.repository;

import com.businessexchange.support.entity.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    List<SupportTicket> findByCreatedByIdOrderByCreatedAtDesc(Long createdById);
    List<SupportTicket> findByAssignedToIdOrderByCreatedAtDesc(Long assignedToId);
    List<SupportTicket> findAllByOrderByCreatedAtDesc();
}
