package com.businessexchange.favorite.entity;

import com.businessexchange.business.entity.Business;
import com.businessexchange.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "saved_businesses", uniqueConstraints = {
        @UniqueConstraint(name = "uk_saved_business_buyer_business", columnNames = {"buyer_id", "business_id"})
}, indexes = {
        @Index(name = "idx_saved_businesses_buyer_id", columnList = "buyer_id"),
        @Index(name = "idx_saved_businesses_business_id", columnList = "business_id"),
        @Index(name = "idx_saved_businesses_saved_at", columnList = "saved_at DESC")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavedBusiness {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @ManyToOne
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @Column(name = "saved_at", nullable = false, updatable = false)
    private LocalDateTime savedAt;

    @PrePersist
    public void onCreate() {
        savedAt = LocalDateTime.now();
    }
}
