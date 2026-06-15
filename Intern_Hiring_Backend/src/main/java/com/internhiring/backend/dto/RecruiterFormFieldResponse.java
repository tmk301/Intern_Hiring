package com.internhiring.backend.dto;

public record RecruiterFormFieldResponse(
        Long id,
        String name,
        String label,
        String validationRegex,
        String placeholder,
        boolean required,
        int sortOrder,
        boolean active) {
}
