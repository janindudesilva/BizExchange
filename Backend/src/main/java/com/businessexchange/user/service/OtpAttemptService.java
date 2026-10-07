package com.businessexchange.user.service;

import com.businessexchange.auth.entity.PasswordResetRequest;
import com.businessexchange.auth.repository.PasswordResetRequestRepository;
import com.businessexchange.user.entity.PasswordChangeOtp;
import com.businessexchange.user.repository.PasswordChangeOtpRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpAttemptService {

    private final PasswordChangeOtpRepository otpRepository;
    private final PasswordResetRequestRepository resetRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int incrementPasswordChangeOtpAttempt(Long otpId) {
        otpRepository.incrementAttempts(otpId);
        return otpRepository.findById(otpId)
                .map(PasswordChangeOtp::getAttemptCount)
                .orElse(1);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int incrementPasswordResetOtpAttempt(UUID resetId) {
        resetRepository.incrementAttempts(resetId);
        return resetRepository.findById(resetId)
                .map(PasswordResetRequest::getAttemptCount)
                .orElse(1);
    }
}
