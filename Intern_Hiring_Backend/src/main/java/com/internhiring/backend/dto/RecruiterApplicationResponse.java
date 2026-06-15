package com.internhiring.backend.dto;

import com.internhiring.backend.entity.RecruiterApplicationStatus;

import java.time.LocalDateTime;
import java.util.Map;

public record RecruiterApplicationResponse(
        Long id,
        Long applicantId,
        String applicantEmail,
        Map<String, String> formData,
        RecruiterApplicationStatus status,
        String reviewNote,
        Long reviewedById,
        LocalDateTime reviewedAt,
        LocalDateTime createdAt) {
}
