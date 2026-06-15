package com.internhiring.backend.dto;

import com.internhiring.backend.entity.JobStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record AdminJobResponse(
        Long id,
        String title,
        String company,
        Long recruiterId,
        String employerName,
        String employerEmail,
        String location,
        String type,
        String salary,
        String experience,
        LocalDate applicationDeadline,
        JobStatus status,
        boolean hidden,
        String description,
        LocalDateTime createdAt,
        LocalDateTime deletedAt
) {
}
