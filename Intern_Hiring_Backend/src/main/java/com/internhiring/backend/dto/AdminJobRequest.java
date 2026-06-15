package com.internhiring.backend.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record AdminJobRequest(
        @NotBlank(message = "Title is required") String title,
        String company,
        Long recruiterId,
        String employerName,
        String employerEmail,
        String location,
        String type,
        String salary,
        String experience,
        LocalDate applicationDeadline,
        String description
) {
}
