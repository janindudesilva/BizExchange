package com.businessexchange.review.repository;

import com.businessexchange.review.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    Optional<Review> findByBuyerIdAndSellerId(Long buyerId, Long sellerId);
    List<Review> findBySellerIdOrderByCreatedAtDesc(Long sellerId);
    
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.seller.id = :sellerId")
    Double calculateAverageRating(@Param("sellerId") Long sellerId);
    
    @Query("SELECT COUNT(r) FROM Review r WHERE r.seller.id = :sellerId")
    Long countBySellerId(@Param("sellerId") Long sellerId);
    
    @Query("SELECT AVG(r.rating) FROM Review r")
    Double calculateAverageRatingAcrossAllSellers();
}
