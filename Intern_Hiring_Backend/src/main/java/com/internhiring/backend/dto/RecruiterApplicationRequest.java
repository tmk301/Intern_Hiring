package com.internhiring.backend.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.Map;

public record RecruiterApplicationRequest(
        @NotEmpty Map<String, String> formData) {
}
