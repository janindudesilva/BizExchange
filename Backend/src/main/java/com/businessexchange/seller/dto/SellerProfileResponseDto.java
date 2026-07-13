package com.businessexchange.seller.dto;

import com.businessexchange.seller.entity.VerificationStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SellerProfileResponseDto {

    private Long id;              // seller profile id

    private Long userId;
    private String fullName;
    private String email;
    private String phone;

    private String nicOrPassport;
    private String address;
    private String businessOwnerType;

    private VerificationStatus verificationStatus;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private String accountStatus;
    private Boolean emailVerified;
    private LocalDateTime lastLoginAt;
}
