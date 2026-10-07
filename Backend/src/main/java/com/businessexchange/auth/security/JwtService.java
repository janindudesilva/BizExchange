package com.businessexchange.auth.security;

import com.businessexchange.user.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private Long jwtExpiration;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(User user) {
        int tokenVersion = user.getTokenVersion() != null ? user.getTokenVersion() : 1;
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getId())
                .claim("role", user.getRole().name())
                .claim("tokenVersion", tokenVersion)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSigningKey())
                .compact();
    }

    public String extractEmail(String token) {
        return extractClaims(token).getSubject();
    }

    public Integer extractTokenVersion(String token) {
        try {
            Object tv = extractClaims(token).get("tokenVersion");
            if (tv instanceof Number n) {
                return n.intValue();
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    public boolean isTokenValid(String token, User user) {
        String email = extractEmail(token);
        if (!email.equals(user.getEmail()) || isTokenExpired(token)) {
            return false;
        }
        Integer tokenVersion = extractTokenVersion(token);
        int currentVersion = user.getTokenVersion() != null ? user.getTokenVersion() : 1;
        return tokenVersion != null && tokenVersion == currentVersion;
    }

    private boolean isTokenExpired(String token) {
        return extractClaims(token).getExpiration().before(new Date());
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
