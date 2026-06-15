package com.internhiring.backend.service;

import com.internhiring.backend.entity.User;
import com.internhiring.backend.entity.Role;
import com.internhiring.backend.repository.UserRepository;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SupabaseUserSyncService {

    private final UserRepository userRepository;

    @Transactional
    public User syncUserFromSupabase(Claims claims) {
        String supabaseIdStr = claims.getSubject();
        String email = claims.get("email", String.class);
        String firstName = claims.get("firstName", String.class);
        String lastName = claims.get("lastName", String.class);
        String phoneNumber = claims.get("phoneNumber", String.class);

        if (supabaseIdStr == null || email == null) {
            throw new IllegalArgumentException("Missing supabase_id or email in JWT claims");
        }

        UUID supabaseId = UUID.fromString(supabaseIdStr);

        return userRepository.findBySupabaseId(supabaseId)
                .map(existingUser -> {
                    // Update existing user if fields are null but provided in token
                    boolean updated = false;
                    if (existingUser.getFirstName() == null && firstName != null) {
                        existingUser.setFirstName(firstName);
                        updated = true;
                    }
                    if (existingUser.getLastName() == null && lastName != null) {
                        existingUser.setLastName(lastName);
                        updated = true;
                    }
                    if (existingUser.getPhoneNumber() == null && phoneNumber != null) {
                        existingUser.setPhoneNumber(phoneNumber);
                        updated = true;
                    }
                    if (updated) {
                        log.info("Updating existing user {} from Supabase metadata", email);
                        return userRepository.save(existingUser);
                    }
                    return existingUser;
                })
                .orElseGet(() -> {
                    return userRepository.findByEmail(email).map(existingUser -> {
                        log.info("Linking existing user {} to Supabase ID {}", email, supabaseId);
                        existingUser.setSupabaseId(supabaseId);
                        if (existingUser.getFirstName() == null) existingUser.setFirstName(firstName);
                        if (existingUser.getLastName() == null) existingUser.setLastName(lastName);
                        if (existingUser.getPhoneNumber() == null) existingUser.setPhoneNumber(phoneNumber);
                        return userRepository.save(existingUser);
                    }).orElseGet(() -> {
                        log.info("Creating new user from Supabase: {} ({})", email, supabaseId);
                        User newUser = new User();
                        newUser.setSupabaseId(supabaseId);
                        newUser.setEmail(email);
                        newUser.setFirstName(firstName);
                        newUser.setLastName(lastName);
                        newUser.setPhoneNumber(phoneNumber);
                        newUser.setRole(Role.CANDIDATE);
                        return userRepository.save(newUser);
                    });
                });
    }
}
