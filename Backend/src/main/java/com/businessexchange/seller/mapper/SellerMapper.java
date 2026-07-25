package com.businessexchange.seller.mapper;

import com.businessexchange.seller.dto.SellerProfileResponseDto;
import com.businessexchange.seller.entity.SellerProfile;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface SellerMapper {

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "fullName", source = "user.fullName")
    @Mapping(target = "email", source = "user.email")
    @Mapping(target = "phone", source = "user.phone")
    @Mapping(target = "accountStatus", source = "user.status")
    @Mapping(target = "emailVerified", source = "user.emailVerified")
    @Mapping(target = "lastLoginAt", source = "user.lastLoginAt")
    @Mapping(target = "reviewedByName", source = "reviewedBy", qualifiedByName = "mapReviewedByName")
    @Mapping(target = "averageRating", ignore = true)
    @Mapping(target = "reviewCount", ignore = true)
    SellerProfileResponseDto toDto(SellerProfile sellerProfile);

    @Named("mapReviewedByName")
    default String mapReviewedByName(com.businessexchange.user.entity.User reviewedBy) {
        return reviewedBy != null ? reviewedBy.getFullName() : null;
    }
}
