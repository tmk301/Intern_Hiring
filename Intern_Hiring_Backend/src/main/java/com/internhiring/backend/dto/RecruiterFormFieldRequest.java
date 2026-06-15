package com.internhiring.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RecruiterFormFieldRequest(
        @NotBlank @Pattern(regexp = "^[a-zA-Z][a-zA-Z0-9_]*$") String name,
        @NotBlank String label,
        String validationRegex,
        String placeholder,
        boolean required,
        int sortOrder,
        boolean active) {
}
