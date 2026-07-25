package com.businessexchange.support.dto;

import com.businessexchange.business.entity.BusinessStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LimitedBusinessView {
    private Long id;
    private String title;
    private String sellerName;
    private BusinessStatus status;
}
