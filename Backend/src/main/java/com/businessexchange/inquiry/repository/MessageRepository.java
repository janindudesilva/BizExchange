package com.businessexchange.inquiry.repository;

import com.businessexchange.inquiry.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByInquiryIdOrderByCreatedAtAsc(Long inquiryId);
}
