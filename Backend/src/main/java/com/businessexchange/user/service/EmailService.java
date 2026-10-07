package com.businessexchange.user.service;

import com.businessexchange.user.entity.EmailVerificationToken;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.repository.EmailVerificationTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.verification.token.expiry.hours:24}")
    private int tokenExpiryHours;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Transactional
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

    public void sendVerificationEmail(User user, String verificationLink) {
        if (mailSender != null) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(user.getEmail());
                message.setSubject("Verify your email address - BizExchange");
                message.setText("Welcome to BizExchange!\n\nPlease click the following link to verify your email address:\n"
                        + verificationLink + "\n\nThis link will expire in " + tokenExpiryHours + " hours.");
                mailSender.send(message);
                log.info("Verification email sent to {}", user.getEmail());
            } catch (Exception e) {
                log.error("Failed to send verification email via mailSender to {}: {}", user.getEmail(), e.getMessage());
                if ("dev".equalsIgnoreCase(activeProfile) || "test".equalsIgnoreCase(activeProfile) || "local".equalsIgnoreCase(activeProfile)) {
                    log.info("Development/local profile: Simulated verification email for {}", user.getEmail());
                } else {
                    throw new RuntimeException("Failed to send verification email. Please check email settings.", e);
                }
            }
        } else {
            if ("dev".equalsIgnoreCase(activeProfile) || "test".equalsIgnoreCase(activeProfile) || "local".equalsIgnoreCase(activeProfile)) {
                log.info("Development/local profile: Verification email simulated for {}", user.getEmail());
            } else {
                throw new IllegalStateException("MailSender is not configured in environment: " + activeProfile);
            }
        }
    }

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @jakarta.annotation.PostConstruct
    public void init() {
        log.info("EmailService initialized with active profile: {}", activeProfile);
    }

    public void sendOtpEmail(String toEmail, String otp) {
        if (mailSender != null) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(toEmail);
                message.setSubject("Your password reset code - BizExchange");
                message.setText("Your OTP code is: " + otp + "\nIt expires in 10 minutes.");
                mailSender.send(message);
                log.info("OTP email sent successfully via SMTP to {}", toEmail);
                return;
            } catch (Exception e) {
                log.error("Failed to send OTP via JavaMailSender to {}: {}", toEmail, e.getMessage());
                if ("dev".equalsIgnoreCase(activeProfile) || "test".equalsIgnoreCase(activeProfile) || "local".equalsIgnoreCase(activeProfile)) {
                    log.info("Development/local profile: Simulated OTP dispatch for user {}", toEmail);
                } else {
                    throw new RuntimeException("Failed to send OTP email. Please try again later.", e);
                }
            }
        }

        if ("dev".equalsIgnoreCase(activeProfile) || "test".equalsIgnoreCase(activeProfile) || "local".equalsIgnoreCase(activeProfile)) {
            log.info("Development/local profile (No MailSender): OTP dispatch simulated for user {}", toEmail);
        } else {
            throw new IllegalStateException("MailSender is not configured in environment: " + activeProfile);
        }
    }


    /**
     * Send OTP via email for password change
     */
    public void sendPasswordChangeOtp(User user, String otpCode) {
        sendOtpEmail(user.getEmail(), otpCode);
    }

    /**
     * Send generic notification email
     */
    public void sendNotificationEmail(String toEmail, String subject, String htmlContent) {
        log.info("========================================");
        log.info("NOTIFICATION EMAIL");
        log.info("========================================");
        log.info("To: {}", toEmail);
        log.info("Subject: {}", subject);
        log.info("Content: {}", htmlContent);
        log.info("========================================");
    }
}
