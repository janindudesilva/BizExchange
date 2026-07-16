package com.businessexchange.business.mapper;

import com.businessexchange.business.dto.CategoryRequest;
import com.businessexchange.business.dto.CategoryResponse;
import com.businessexchange.business.entity.BusinessCategory;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CategoryMapper {

    CategoryResponse toDto(BusinessCategory category);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    BusinessCategory toEntity(CategoryRequest request);
}
