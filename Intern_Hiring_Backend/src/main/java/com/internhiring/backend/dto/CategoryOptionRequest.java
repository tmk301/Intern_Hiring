package com.internhiring.backend.dto;

import com.internhiring.backend.entity.CategoryKey;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CategoryOptionRequest(
        @NotNull CategoryKey categoryKey,
        @NotBlank String value,
        @NotBlank String label,
        int sortOrder,
        boolean active) {
}
