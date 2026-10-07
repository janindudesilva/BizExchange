package com.businessexchange.user.controller;

import com.businessexchange.common.response.ApiResponse;
import com.businessexchange.user.dto.UserResponse;
import com.businessexchange.user.entity.AccountStatus;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserRepository userRepository;
    private final com.businessexchange.common.audit.service.AuditService auditService;

    @GetMapping
    public ApiResponse<List<UserResponse>> getAllUsers() {
        List<User> users = userRepository.findAllByOrderByCreatedAtDesc();
        List<UserResponse> userResponses = users.stream()
                .map(this::mapToResponse)
                .toList();
        return ApiResponse.success("Users fetched successfully", userResponses);
    }

    @PutMapping("/{userId}/suspend")
    public ApiResponse<Void> suspendUser(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new com.businessexchange.common.exception.ResourceNotFoundException("User not found"));

        if (user.getRole() == UserRole.ADMIN) {
            throw new IllegalArgumentException("Cannot suspend admin users");
        }

        if (user.getStatus() == AccountStatus.DELETED) {
            throw new IllegalArgumentException("Cannot suspend a deleted account");
        }

        user.setStatus(AccountStatus.SUSPENDED);
        userRepository.save(user);
        auditService.record(null, "USER_SUSPENDED", "USER", userId, "User suspended: " + user.getEmail());

        return ApiResponse.success("User suspended successfully", null);
    }

    @PutMapping("/{userId}/unsuspend")
    public ApiResponse<Void> unsuspendUser(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new com.businessexchange.common.exception.ResourceNotFoundException("User not found"));

        // Only suspended accounts may be un-suspended
        if (user.getStatus() != AccountStatus.SUSPENDED) {
            throw new IllegalArgumentException(
                    "User is not suspended (current status: " + user.getStatus() + ")");
        }

        // Deleted accounts must never be revived via this endpoint
        if (user.getStatus() == AccountStatus.DELETED) {
            throw new IllegalArgumentException("Cannot unsuspend a deleted account");
        }

        // Unverified users return to PENDING_VERIFICATION, not ACTIVE
        if (Boolean.FALSE.equals(user.getEmailVerified())) {
            user.setStatus(AccountStatus.PENDING_VERIFICATION);
            userRepository.save(user);
            auditService.record(null, "USER_UNSUSPENDED", "USER", userId, "User unsuspended to PENDING_VERIFICATION: " + user.getEmail());
            return ApiResponse.success("User unsuspended — returned to PENDING_VERIFICATION (email not verified)", null);
        }

        user.setStatus(AccountStatus.ACTIVE);
        userRepository.save(user);
        auditService.record(null, "USER_UNSUSPENDED", "USER", userId, "User unsuspended to ACTIVE: " + user.getEmail());

        return ApiResponse.success("User unsuspended successfully", null);
    }

    private UserResponse mapToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .status(user.getStatus().name())
                .emailVerified(user.getEmailVerified())
                .build();
    }
}
