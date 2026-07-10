package com.businessexchange.auth.service;

import com.businessexchange.auth.dto.*;
import com.businessexchange.auth.security.JwtService;
import com.businessexchange.buyer.entity.BuyerProfile;
import com.businessexchange.buyer.repository.BuyerProfileRepository;
import com.businessexchange.common.exception.DuplicateResourceException;
import com.businessexchange.seller.entity.SellerProfile;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.seller.repository.SellerProfileRepository;
import com.businessexchange.user.entity.AccountStatus;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final BuyerProfileRepository buyerProfileRepository;
    private final SellerProfileRepository sellerProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse registerBuyer(RegisterBuyerRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already exists");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.BUYER)
                .status(AccountStatus.ACTIVE)
                .emailVerified(false)
                .build();

        User savedUser = userRepository.save(user);

        BuyerProfile profile = BuyerProfile.builder()
                .user(savedUser)
                .preferredBusinessCategory(request.getPreferredBusinessCategory())
                .preferredLocation(request.getPreferredLocation())
                .budgetMin(request.getBudgetMin() == null ? null : BigDecimal.valueOf(request.getBudgetMin()))
                .budgetMax(request.getBudgetMax() == null ? null : BigDecimal.valueOf(request.getBudgetMax()))
                .build();

        buyerProfileRepository.save(profile);

        String token = jwtService.generateToken(savedUser);

        return new AuthResponse(
                savedUser.getId(),
                savedUser.getFullName(),
                savedUser.getEmail(),
                savedUser.getRole().name(),
                token
        );
    }

    @Transactional
    public AuthResponse registerSeller(RegisterSellerRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already exists");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.SELLER)
                .status(AccountStatus.ACTIVE)
                .emailVerified(false)
                .build();

        User savedUser = userRepository.save(user);

        SellerProfile profile = SellerProfile.builder()
                .user(savedUser)
                .nicOrPassport(request.getNicOrPassport())
                .address(request.getAddress())
                .businessOwnerType(request.getBusinessOwnerType())
                .verificationStatus(VerificationStatus.PENDING)
                .build();

        sellerProfileRepository.save(profile);

        String token = jwtService.generateToken(savedUser);

        return new AuthResponse(
                savedUser.getId(),
                savedUser.getFullName(),
                savedUser.getEmail(),
                savedUser.getRole().name(),
                token
        );
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password");
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtService.generateToken(user);

        return new AuthResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole().name(),
                token
        );
    }
}
