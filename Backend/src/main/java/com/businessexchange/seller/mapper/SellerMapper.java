package com.businessexchange.seller.mapper;

import com.businessexchange.seller.dto.SellerProfileResponseDto;
import com.businessexchange.seller.entity.SellerProfile;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SellerMapper {

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "fullName", source = "user.fullName")
    @Mapping(target = "email", source = "user.email")
    @Mapping(target = "phone", source = "user.phone")
    SellerProfileResponseDto toDto(SellerProfile sellerProfile);
}
