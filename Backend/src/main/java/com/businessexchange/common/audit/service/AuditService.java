package com.businessexchange.common.audit.service;

import com.businessexchange.common.audit.entity.AuditLog;
import com.businessexchange.common.audit.repository.AuditLogRepository;
import com.businessexchange.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(User user, String action, String entityType, Long entityId, String description) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .user(user)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .description(description)
                    .build();
            auditLogRepository.save(auditLog);
            log.info("AUDIT: action='{}' user='{}' entity='{}:{}' details='{}'",
                    action, user != null ? user.getEmail() : "system", entityType, entityId, description);
        } catch (Exception e) {
            log.warn("Could not save audit log entry: {}", e.getMessage());
        }
    }
}
