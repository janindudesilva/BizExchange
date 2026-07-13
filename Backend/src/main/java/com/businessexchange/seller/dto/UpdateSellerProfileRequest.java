package com.businessexchange.seller.dto;

import lombok.Data;

@Data
public class UpdateSellerProfileRequest {
    private String nicOrPassport;
    private String address;
    private String businessOwnerType;
    private String phoneNumber;
    private String email;
}