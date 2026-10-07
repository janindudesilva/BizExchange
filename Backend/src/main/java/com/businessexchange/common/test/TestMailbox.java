package com.businessexchange.common.test;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Isolated in-memory test mailbox for automated integration and E2E verification.
 * Strictly limited to development, local, and test profiles.
 */
@Component
@Profile({"dev", "local", "test"})
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "app.test-mailbox.enabled", havingValue = "true")
public class TestMailbox {

    public record RecordedEmail(String toEmail, String type, String link, String tokenOrOtp) {}

    private final Map<String, RecordedEmail> latestEmails = new ConcurrentHashMap<>();

    public void recordEmail(String toEmail, String type, String link, String tokenOrOtp) {
        if (toEmail != null) {
            latestEmails.put(toEmail.toLowerCase().trim(), new RecordedEmail(toEmail, type, link, tokenOrOtp));
        }
    }

    public RecordedEmail getLatest(String email) {
        if (email == null) return null;
        return latestEmails.get(email.toLowerCase().trim());
    }

    public void clear() {
        latestEmails.clear();
    }
}
