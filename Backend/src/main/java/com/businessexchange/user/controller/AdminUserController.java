package com.businessexchange.user.controller;

import com.businessexchange.common.response.ApiResponse;
import com.businessexchange.user.dto.UserResponse;
import com.businessexchange.user.entity.AccountStatus;
import com.businessexchange.user.entity.User;
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
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole().name().equals("ADMIN")) {
            throw new RuntimeException("Cannot suspend admin users");
        }

        user.setStatus(AccountStatus.SUSPENDED);
        userRepository.save(user);

        return ApiResponse.success("User suspended successfully", null);
    }

    @PutMapping("/{userId}/unsuspend")
    public ApiResponse<Void> unsuspendUser(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setStatus(AccountStatus.ACTIVE);
        userRepository.save(user);

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
