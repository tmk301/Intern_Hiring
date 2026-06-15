package com.internhiring.backend.controller;

import com.internhiring.backend.entity.User;
import com.internhiring.backend.security.SupabaseTokenVerificationService;
import com.internhiring.backend.service.SupabaseUserSyncService;
import com.internhiring.backend.service.UserService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final SupabaseTokenVerificationService tokenVerificationService;
    private final SupabaseUserSyncService supabaseUserSyncService;
    private final UserService userService;


    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "Authorization header required"));
        }

        String token = authHeader.substring(7);
        try {
            Claims claims = tokenVerificationService.verifyToken(token);
            String supabaseIdStr = claims.getSubject();
            String email = claims.get("email", String.class);
            UUID supabaseId = UUID.fromString(supabaseIdStr);

            // Try to get user from local DB
            User user = userService.getUserBySupabaseId(supabaseId)
                    .orElseGet(() -> supabaseUserSyncService.syncUserFromSupabase(claims));

            return ResponseEntity.ok(userService.mapToUserResponse(user));
        } catch (Exception e) {
            log.error("Failed to get current user: {}", e.getMessage());
            return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
        }
    }
}
