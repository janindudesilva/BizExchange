package com.businessexchange.business.entity;

import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "businesses", indexes = {
        @Index(name = "idx_business_seller_id", columnList = "seller_id"),
        @Index(name = "idx_business_category_id", columnList = "category_id"),
        @Index(name = "idx_business_status_verification", columnList = "status, verification_status"),
        @Index(name = "idx_business_created_at", columnList = "created_at DESC"),
        @Index(name = "idx_business_price", columnList = "asking_price"),
        @Index(name = "idx_business_location", columnList = "location")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Business {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Builder.Default
    @Column(name = "version")
    private Long version = 0L;

    @ManyToOne
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @ManyToOne
    @JoinColumn(name = "category_id", nullable = false)
    private BusinessCategory category;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 200)
    private String location;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "asking_price", nullable = false)
    private BigDecimal askingPrice;

    @Column(name = "business_age_years")
    private Integer businessAgeYears;

    @Column(name = "number_of_employees")
    private Integer numberOfEmployees;

    @Column(name = "reason_for_selling", columnDefinition = "TEXT")
    private String reasonForSelling;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private BusinessStatus status = BusinessStatus.PENDING_REVIEW;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false)
    private VerificationStatus verificationStatus = VerificationStatus.PENDING;

    @ManyToOne
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();

        if (status == null) {
            status = BusinessStatus.PENDING_REVIEW;
        }
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
