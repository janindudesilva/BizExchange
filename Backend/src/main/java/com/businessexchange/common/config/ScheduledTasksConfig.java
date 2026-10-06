package com.businessexchange.common.config;

import com.businessexchange.user.service.OtpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class ScheduledTasksConfig {

    private final OtpService otpService;

    /**
     * Clean up expired OTPs every hour
     */
    @Scheduled(fixedDelay = 3600000)  // 1 hour
    public void cleanupExpiredOtps() {
        try {
            otpService.cleanupExpiredOtps();
            log.info("Expired OTPs cleanup job completed");
        } catch (Exception e) {
            log.error("Error during OTP cleanup: {}", e.getMessage());
        }
    }
}
