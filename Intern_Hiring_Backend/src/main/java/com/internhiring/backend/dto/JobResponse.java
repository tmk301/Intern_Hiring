package com.internhiring.backend.dto;

import com.internhiring.backend.entity.JobStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record JobResponse(
        Long id,
        String title,
        String company,
        String employerName,
        String employerEmail,
        String location,
        String type,
        String salary,
        String experience,
        String description,
        LocalDate applicationDeadline,
        JobStatus status,
        boolean hidden,
        Long recruiterId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime deletedAt
) {
}
