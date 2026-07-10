package com.businessexchange.auth.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterSellerRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @Email(message = "Invalid email format")
    @NotBlank(message = "Email is required")
    private String email;

    private String phone;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters long")
    private String password;

    private String nicOrPassport;
    private String address;
    private String businessOwnerType;
}
