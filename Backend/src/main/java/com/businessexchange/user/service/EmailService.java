package com.businessexchange.user.service;

import com.businessexchange.user.entity.EmailVerificationToken;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.repository.EmailVerificationTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Value("${app.verification.token.expiry.hours:24}")
    private int tokenExpiryHours;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    public EmailVerificationToken createVerificationToken(User user) {
        // Delete any existing token for this user
        emailVerificationTokenRepository.deleteByUserId(user.getId());

        String token = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(tokenExpiryHours);

        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .userId(user.getId())
                .token(token)
                .expiresAt(expiresAt)
                .build();

        return emailVerificationTokenRepository.save(verificationToken);
    }

    public String generateVerificationLink(String token) {
        return frontendUrl + "/verify-email?token=" + token;
    }

    // TODO: Integrate with actual email sending service (e.g., JavaMail, SendGrid, etc.)
    public void sendVerificationEmail(User user, String verificationLink) {
        // Placeholder for email sending logic
        // For now, this will log the verification link
        System.out.println("========================================");
        System.out.println("EMAIL VERIFICATION LINK");
        System.out.println("========================================");
        System.out.println("To: " + user.getEmail());
        System.out.println("Subject: Verify your email address");
        System.out.println("Body: Please click the following link to verify your email:");
        System.out.println(verificationLink);
        System.out.println("========================================");
    }
}
