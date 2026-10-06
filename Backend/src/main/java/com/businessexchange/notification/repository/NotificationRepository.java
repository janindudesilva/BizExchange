package com.businessexchange.notification.repository;

import com.businessexchange.notification.entity.Notification;
import com.businessexchange.notification.entity.NotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Notification> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, NotificationStatus status);
    long countByUserIdAndStatus(Long userId, NotificationStatus status);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Notification n SET n.status = :newStatus, n.readAt = :now WHERE n.user.id = :userId AND n.status = :oldStatus")
    int markAllAsRead(@org.springframework.data.repository.query.Param("userId") Long userId,
                      @org.springframework.data.repository.query.Param("newStatus") NotificationStatus newStatus,
                      @org.springframework.data.repository.query.Param("oldStatus") NotificationStatus oldStatus,
                      @org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now);
}
