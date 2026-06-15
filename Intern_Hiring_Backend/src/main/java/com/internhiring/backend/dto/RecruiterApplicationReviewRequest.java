package com.internhiring.backend.dto;

import jakarta.validation.constraints.NotNull;

public record RecruiterApplicationReviewRequest(
        @NotNull Boolean approved,
        String reviewNote) {
}
