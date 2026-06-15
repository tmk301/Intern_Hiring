package com.internhiring.backend.dto;
import com.internhiring.backend.entity.CvItem;
import java.util.List;

import com.internhiring.backend.entity.Gender;
import com.internhiring.backend.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String avatarUrl;
    private List<CvItem> cvList;
    private Gender gender;
    private LocalDate dob;
    private String themeColor;
    private boolean emailNotificationsEnabled;
    private Role role;
    private boolean restricted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
