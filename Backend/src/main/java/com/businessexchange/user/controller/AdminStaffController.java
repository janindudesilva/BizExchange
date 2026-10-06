package com.businessexchange.user.controller;

import com.businessexchange.common.exception.DuplicateResourceException;
import com.businessexchange.common.response.ApiResponse;
import com.businessexchange.user.dto.CreateStaffRequest;
import com.businessexchange.user.dto.UserResponse;
import com.businessexchange.user.entity.AccountStatus;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/staff")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminStaffController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public ApiResponse<List<UserResponse>> getStaffMembers() {
        List<UserRole> staffRoles = List.of(
                UserRole.ADMIN,
                UserRole.SUPPORT_AGENT,
                UserRole.VERIFICATION_OFFICER
        );

        List<User> staff = userRepository.findByRoleIn(staffRoles);

        List<UserResponse> responses = staff.stream()
                .map(this::mapToResponse)
                .toList();

        return ApiResponse.success("Staff members fetched successfully", responses);
    }

    @PostMapping
    public ApiResponse<UserResponse> createStaff(@Valid @RequestBody CreateStaffRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email is already registered");
        }

        UserRole role;
        try {
            role = UserRole.valueOf(request.getRole().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role specified: " + request.getRole());
        }

        if (role != UserRole.ADMIN && role != UserRole.SUPPORT_AGENT && role != UserRole.VERIFICATION_OFFICER) {
            throw new IllegalArgumentException("Staff member role must be ADMIN, SUPPORT_AGENT, or VERIFICATION_OFFICER");
        }

        User staffMember = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .status(AccountStatus.ACTIVE)
                .emailVerified(true)
                .build();

        User saved = userRepository.save(staffMember);

        return ApiResponse.success("Staff account created successfully", mapToResponse(saved));
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
