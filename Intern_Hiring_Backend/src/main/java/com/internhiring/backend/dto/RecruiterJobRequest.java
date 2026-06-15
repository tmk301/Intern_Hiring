package com.internhiring.backend.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record RecruiterJobRequest(
        @NotBlank(message = "Title is required") String title,
        String company,
        String employerName,
        String location,
        @NotBlank(message = "Type is required") String type,
        String salary,
        String experience,
        LocalDate applicationDeadline,
        @NotBlank(message = "Description is required") String description
) {
}
