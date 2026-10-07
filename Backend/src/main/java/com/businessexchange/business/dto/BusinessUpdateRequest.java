package com.businessexchange.business.dto;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BusinessUpdateRequest {

    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    private String description;

    @Size(max = 200, message = "Location must not exceed 200 characters")
    private String location;

    private String address;

    @Positive(message = "Asking price must be positive")
    private BigDecimal askingPrice;

    private String category;
    private Integer businessAgeYears;
    private Integer numberOfEmployees;
    private String reasonForSelling;

    @Builder.Default
    private Set<String> presentFields = new HashSet<>();

    private Boolean clearAddress;
    private Boolean clearBusinessAgeYears;
    private Boolean clearNumberOfEmployees;
    private Boolean clearReasonForSelling;

    public void setTitle(String title) {
        this.title = title;
        markPresent("title");
    }

    public void setDescription(String description) {
        this.description = description;
        markPresent("description");
    }

    public void setLocation(String location) {
        this.location = location;
        markPresent("location");
    }

    public void setAddress(String address) {
        this.address = address;
        markPresent("address");
    }

    public void setAskingPrice(BigDecimal askingPrice) {
        this.askingPrice = askingPrice;
        markPresent("askingPrice");
    }

    public void setCategory(String category) {
        this.category = category;
        markPresent("category");
    }

    public void setBusinessAgeYears(Integer businessAgeYears) {
        this.businessAgeYears = businessAgeYears;
        markPresent("businessAgeYears");
    }

    public void setNumberOfEmployees(Integer numberOfEmployees) {
        this.numberOfEmployees = numberOfEmployees;
        markPresent("numberOfEmployees");
    }

    public void setReasonForSelling(String reasonForSelling) {
        this.reasonForSelling = reasonForSelling;
        markPresent("reasonForSelling");
    }

    private void markPresent(String fieldName) {
        if (this.presentFields == null) {
            this.presentFields = new HashSet<>();
        }
        this.presentFields.add(fieldName);
    }

    public boolean isFieldPresent(String fieldName) {
        return presentFields != null && presentFields.contains(fieldName);
    }
}