package com.businessexchange.support.dto;

import com.businessexchange.user.entity.AccountStatus;
import com.businessexchange.user.entity.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LimitedUserView {
    private Long id;
    private String fullName;
    private String email;
    private UserRole role;
    private AccountStatus status;
}
