package com.businessexchange.business.controller;

import com.businessexchange.business.dto.CategoryResponse;
import com.businessexchange.business.service.BusinessCategoryService;
import com.businessexchange.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final BusinessCategoryService categoryService;

    @GetMapping
    public ApiResponse<List<CategoryResponse>> getAllCategories() {
        List<CategoryResponse> categories = categoryService.getAll();
        return ApiResponse.success("Categories fetched successfully", categories);
    }
}
