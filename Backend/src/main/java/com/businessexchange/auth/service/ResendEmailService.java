package com.businessexchange.auth.service;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service("resendEmailService")
public class ResendEmailService {

    private final Resend resend;
    private final String fromAddress;

    public ResendEmailService(
            @Value("${resend.api-key}") String apiKey,
            @Value("${resend.from-address}") String fromAddress) {
        this.resend = new Resend(apiKey);
        this.fromAddress = fromAddress;
    }

    public void sendOtp(String toEmail, String otp) {
        if (toEmail == null || toEmail.isBlank()) {
            throw new IllegalArgumentException("toEmail must not be null or blank");
        }
        if (otp == null || otp.isBlank()) {
            throw new IllegalArgumentException("otp must not be null or blank");
        }

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from(fromAddress)
                .to(toEmail)
                .subject("Password Reset Verification Code")
                .html("""
                        <h2>Password Reset</h2>
                        <p>Your verification code is:</p>
                        <h1>%s</h1>
                        <p>This code expires in 5 minutes. If you didn't request this, ignore this email.</p>
                        """.formatted(otp))
                .build();

        try {
            resend.emails().send(params);
        } catch (ResendException e) {
            throw new RuntimeException("Failed to send OTP email", e);
        }
    }
}
