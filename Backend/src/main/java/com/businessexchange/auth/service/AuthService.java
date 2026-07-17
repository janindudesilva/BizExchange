package com.businessexchange.auth.service;

import com.businessexchange.auth.dto.*;
import com.businessexchange.auth.security.JwtService;
import com.businessexchange.buyer.entity.BuyerProfile;
import com.businessexchange.buyer.repository.BuyerProfileRepository;
import com.businessexchange.common.exception.DuplicateResourceException;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.seller.entity.SellerProfile;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.seller.repository.SellerProfileRepository;
import com.businessexchange.user.entity.AccountStatus;
import com.businessexchange.user.entity.EmailVerificationToken;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.EmailVerificationTokenRepository;
import com.businessexchange.user.repository.UserRepository;
import com.businessexchange.user.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final BuyerProfileRepository buyerProfileRepository;
    private final SellerProfileRepository sellerProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;

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

        // Create and send verification email
        EmailVerificationToken verificationToken = emailService.createVerificationToken(savedUser);
        String verificationLink = emailService.generateVerificationLink(verificationToken.getToken());
        emailService.sendVerificationEmail(savedUser, verificationLink);

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

        // Create and send verification email
        EmailVerificationToken verificationToken = emailService.createVerificationToken(savedUser);
        String verificationLink = emailService.generateVerificationLink(verificationToken.getToken());
        emailService.sendVerificationEmail(savedUser, verificationLink);

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

    @Transactional
    public void verifyEmail(String token) {
        EmailVerificationToken verificationToken = emailVerificationTokenRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid verification token"));

        if (verificationToken.isVerified()) {
            throw new IllegalStateException("Email already verified");
        }

        if (verificationToken.isExpired()) {
            throw new IllegalStateException("Verification token has expired");
        }

        User user = userRepository.findById(verificationToken.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setEmailVerified(true);
        userRepository.save(user);

        verificationToken.setVerifiedAt(LocalDateTime.now());
        emailVerificationTokenRepository.save(verificationToken);
    }

    @Transactional
    public void resendVerificationEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getEmailVerified()) {
            throw new IllegalStateException("Email already verified");
        }

        EmailVerificationToken verificationToken = emailService.createVerificationToken(user);
        String verificationLink = emailService.generateVerificationLink(verificationToken.getToken());
        emailService.sendVerificationEmail(user, verificationLink);
    }
}
