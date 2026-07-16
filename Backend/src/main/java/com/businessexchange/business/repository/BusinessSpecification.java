package com.businessexchange.business.repository;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class BusinessSpecification {

    public static Specification<Business> filter(
            String keyword,
            Long categoryId,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String location
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Always only search for APPROVED listings
            predicates.add(cb.equal(root.get("status"), BusinessStatus.APPROVED));

            if (keyword != null && !keyword.trim().isEmpty()) {
                String likePattern = "%" + keyword.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), likePattern),
                        cb.like(cb.lower(root.get("description")), likePattern)
                ));
            }

            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }

            if (minPrice != null) {
                predicates.add(cb.ge(root.get("askingPrice"), minPrice));
            }

            if (maxPrice != null) {
                predicates.add(cb.le(root.get("askingPrice"), maxPrice));
            }

            if (location != null && !location.trim().isEmpty()) {
                String likePattern = "%" + location.trim().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.get("location")), likePattern));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
