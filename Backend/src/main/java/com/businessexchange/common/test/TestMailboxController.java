package com.businessexchange.common.test;

import com.businessexchange.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller exposing isolated test mailbox queries.
 * Active strictly under dev, local, and test profiles.
 */
@RestController
@RequestMapping("/api/test/mailbox")
@Profile({"dev", "local", "test"})
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "app.test-mailbox.enabled", havingValue = "true")
@RequiredArgsConstructor
public class TestMailboxController {

    private final TestMailbox testMailbox;

    @GetMapping("/latest-verification")
    public ApiResponse<Map<String, String>> getLatestVerification(@RequestParam String email) {
        TestMailbox.RecordedEmail recorded = testMailbox.getLatest(email);
        if (recorded == null) {
            return ApiResponse.error("No verification email found for: " + email);
        }
        return ApiResponse.success("Latest verification token retrieved", Map.of(
                "email", recorded.toEmail(),
                "token", recorded.tokenOrOtp() != null ? recorded.tokenOrOtp() : "",
                "link", recorded.link() != null ? recorded.link() : ""
        ));
    }

    @GetMapping("/latest-otp")
    public ApiResponse<Map<String, String>> getLatestOtp(@RequestParam String email) {
        TestMailbox.RecordedEmail recorded = testMailbox.getLatest(email);
        if (recorded == null) {
            return ApiResponse.error("No OTP email found for: " + email);
        }
        return ApiResponse.success("Latest OTP retrieved", Map.of(
                "email", recorded.toEmail(),
                "otp", recorded.tokenOrOtp() != null ? recorded.tokenOrOtp() : ""
        ));
    }

    @DeleteMapping
    public ApiResponse<Void> clear() {
        testMailbox.clear();
        return ApiResponse.success("Test mailbox cleared", null);
    }
}
