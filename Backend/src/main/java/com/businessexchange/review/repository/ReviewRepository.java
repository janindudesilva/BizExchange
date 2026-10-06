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

    boolean existsByBuyerIdAndSellerId(Long buyerId, Long sellerId);

    @Query("SELECT r.seller.id FROM Review r WHERE r.buyer.id = :buyerId AND r.seller.id IN :sellerIds")
    java.util.Set<Long> findReviewedSellerIdsByBuyerAndSellerIds(@Param("buyerId") Long buyerId, @Param("sellerIds") List<Long> sellerIds);

    @Query("SELECT r.buyer.id FROM Review r WHERE r.seller.id = :sellerId AND r.buyer.id IN :buyerIds")
    java.util.Set<Long> findReviewedBuyerIdsBySellerAndBuyerIds(@Param("sellerId") Long sellerId, @Param("buyerIds") List<Long> buyerIds);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.seller.id = :sellerId")
    Double calculateAverageRating(@Param("sellerId") Long sellerId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.seller.id = :sellerId")
    Long countBySellerId(@Param("sellerId") Long sellerId);

    @Query("SELECT AVG(r.rating) FROM Review r")
    Double calculateAverageRatingAcrossAllSellers();

    /**
     * Batch-fetch average ratings for a set of seller IDs in a single GROUP BY query.
     * Returns rows of [sellerId (Long), averageRating (Double)].
     */
    @Query("SELECT r.seller.id, AVG(r.rating) FROM Review r WHERE r.seller.id IN :sellerIds GROUP BY r.seller.id")
    List<Object[]> findAverageRatingsBySellerIds(@Param("sellerIds") List<Long> sellerIds);

    /**
     * Batch-fetch review counts for a set of seller IDs in a single GROUP BY query.
     * Returns rows of [sellerId (Long), count (Long)].
     */
    @Query("SELECT r.seller.id, COUNT(r) FROM Review r WHERE r.seller.id IN :sellerIds GROUP BY r.seller.id")
    List<Object[]> findReviewCountsBySellerIds(@Param("sellerIds") List<Long> sellerIds);
}
