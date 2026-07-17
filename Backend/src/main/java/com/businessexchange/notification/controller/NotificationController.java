package com.businessexchange.notification.controller;

import com.businessexchange.common.response.ApiResponse;
import com.businessexchange.notification.dto.NotificationResponse;
import com.businessexchange.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ApiResponse<List<NotificationResponse>> getUserNotifications(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<NotificationResponse> response = notificationService.getUserNotifications(userDetails.getUsername());
        return ApiResponse.success("Notifications fetched successfully", response);
    }

    @GetMapping("/unread")
    public ApiResponse<List<NotificationResponse>> getUnreadNotifications(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<NotificationResponse> response = notificationService.getUnreadNotifications(userDetails.getUsername());
        return ApiResponse.success("Unread notifications fetched successfully", response);
    }

    @GetMapping("/unread/count")
    public ApiResponse<Long> getUnreadCount(
            @AuthenticationPrincipal UserDetails userDetails) {
        long count = notificationService.getUnreadCount(userDetails.getUsername());
        return ApiResponse.success("Unread count fetched successfully", count);
    }

    @PutMapping("/{id}/read")
    public ApiResponse<Void> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        notificationService.markAsRead(id, userDetails.getUsername());
        return ApiResponse.success("Notification marked as read", null);
    }

    @PutMapping("/read-all")
    public ApiResponse<Void> markAllAsRead(
            @AuthenticationPrincipal UserDetails userDetails) {
        notificationService.markAllAsRead(userDetails.getUsername());
        return ApiResponse.success("All notifications marked as read", null);
    }
}
