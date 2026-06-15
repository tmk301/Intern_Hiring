package com.internhiring.backend.dto;

import com.internhiring.backend.entity.Gender;

import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import com.internhiring.backend.entity.CvItem;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    @Size(max = 100, message = "First name must not exceed 100 characters")
    private String firstName;

    @Size(max = 100, message = "Last name must not exceed 100 characters")
    private String lastName;

    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    private String phoneNumber;

    @Size(max = 500, message = "Avatar URL must not exceed 500 characters")
    private String avatarUrl;

    private List<CvItem> cvList;

    @Past(message = "Date of birth must be in the past")
    private LocalDate dob;

    private Gender gender;

    private String themeColor;

    private Boolean emailNotificationsEnabled;
}
