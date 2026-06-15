package com.internhiring.backend.dto;

import com.internhiring.backend.entity.CategoryKey;

public record CategoryOptionResponse(
        Long id,
        CategoryKey categoryKey,
        String value,
        String label,
        int sortOrder,
        boolean active) {
}
