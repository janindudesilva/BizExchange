package com.businessexchange.common.config;

import com.businessexchange.user.entity.AccountStatus;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdminSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email}")
    private String adminEmail;

    @Value("${app.admin.password}")
    private String adminPassword;

    @Value("${app.admin.full-name}")
    private String adminFullName;

    @Override
    public void run(String... args) {
        userRepository.findByEmail(adminEmail).ifPresentOrElse(
            existingAdmin -> {
                if (adminPassword != null && !adminPassword.isBlank()) {
                    existingAdmin.setPasswordHash(passwordEncoder.encode(adminPassword));
                    existingAdmin.setStatus(AccountStatus.ACTIVE);
                    existingAdmin.setEmailVerified(true);
                    userRepository.save(existingAdmin);
                    System.out.println("Admin account synchronized with configured password: " + adminEmail);
                }
            },
            () -> {
                User admin = User.builder()
                        .fullName(adminFullName)
                        .email(adminEmail)
                        .phone("0700000000")
                        .passwordHash(passwordEncoder.encode(adminPassword))
                        .role(UserRole.ADMIN)
                        .status(AccountStatus.ACTIVE)
                        .emailVerified(true)
                        .build();
                userRepository.save(admin);
                System.out.println("Default admin account created: " + adminEmail);
            }
        );
    }
}