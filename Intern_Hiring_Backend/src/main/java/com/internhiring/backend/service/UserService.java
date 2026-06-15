package com.internhiring.backend.service;

import com.internhiring.backend.dto.UpdateUserRequest;
import com.internhiring.backend.dto.UserResponse;
import com.internhiring.backend.entity.Role;
import com.internhiring.backend.entity.User;
import com.internhiring.backend.exception.UserNotFoundException;
import com.internhiring.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<User> getUserBySupabaseId(UUID supabaseId) {
        return userRepository.findBySupabaseId(supabaseId);
    }

    public User updateUser(Long id, UpdateUserRequest request) {
        return userRepository.findById(id).map(user -> {
            if (request.getFirstName() != null)
                user.setFirstName(request.getFirstName());
            if (request.getLastName() != null)
                user.setLastName(request.getLastName());
            if (request.getPhoneNumber() != null)
                user.setPhoneNumber(request.getPhoneNumber());
            if (request.getAvatarUrl() != null)
                user.setAvatarUrl(request.getAvatarUrl());
            if (request.getGender() != null)
                user.setGender(request.getGender());
            if (request.getDob() != null)
                user.setDob(request.getDob());
            if (request.getCvList() != null)
                user.setCvList(request.getCvList());
            if (request.getThemeColor() != null)
                user.setThemeColor(request.getThemeColor());
            if (request.getEmailNotificationsEnabled() != null)
                user.setEmailNotificationsEnabled(request.getEmailNotificationsEnabled());
            return userRepository.save(user);
        }).orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));
    }

    public User updateUserRole(Long id, Role role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));
        user.setRole(role);
        return userRepository.save(user);
    }

    public User setUserRestriction(Long id, boolean restricted, String adminEmail) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));
        if (user.getEmail().equals(adminEmail)) {
            throw new AccessDeniedException("Admin cannot restrict their own account");
        }
        user.setRestricted(restricted);
        return userRepository.save(user);
    }

    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new UserNotFoundException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
    }

    public UserResponse mapToUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhoneNumber(),
                user.getAvatarUrl(),
                user.getCvList(),
                user.getGender(),
                user.getDob(),
                user.getThemeColor(),
                user.isEmailNotificationsEnabled(),
                user.getRole(),
                user.isRestricted(),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }

    public User setUserTrusted(Long id, Boolean trusted) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));
        user.setTrusted(trusted);
        return userRepository.save(user);
    }
}
