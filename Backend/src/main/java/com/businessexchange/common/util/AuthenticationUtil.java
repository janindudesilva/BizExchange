package com.businessexchange.common.util;

import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuthenticationUtil {

    private final UserRepository userRepository;

    /**
     * Retrieve the current authenticated user's ID from the security context.
     *
     * @return User ID
     * @throws ResourceNotFoundException if user is not found
     */
    public Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof com.businessexchange.auth.security.UserPrincipal principal) {
            return principal.getId();
        }
        String email = getCurrentUserEmail();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email))
                .getId();
    }

    /**
     * Retrieve the current authenticated user's email from the security context.
     *
     * @return User email
     */
    public String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResourceNotFoundException("User is not authenticated");
        }

        return authentication.getName();
    }

    /**
     * Retrieve the complete User entity for the current authenticated user.
     *
     * @return User entity
     * @throws ResourceNotFoundException if user is not found
     */
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof com.businessexchange.auth.security.UserPrincipal principal) {
            return principal.getUser();
        }
        String email = getCurrentUserEmail();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
    }
}
