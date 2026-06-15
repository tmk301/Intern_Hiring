package com.internhiring.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.internhiring.backend.entity.Job;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record RecruiterJobResponse(
        Long id,
        String title,
        String company,
        @JsonProperty("employer_name") String employerName,
        @JsonProperty("employer_email") String employerEmail,
        String location,
        String type,
        String salary,
        String experience,
        String description,
        LocalDate applicationDeadline,
        String status,
        boolean hidden,
        @JsonProperty("created_at") LocalDateTime createdAt,
        @JsonProperty("updated_at") LocalDateTime updatedAt,
        @JsonProperty("deleted_at") LocalDateTime deletedAt
) {
    public static RecruiterJobResponse from(Job job) {
        return new RecruiterJobResponse(
                job.getId(),
                job.getTitle(),
                job.getCompany(),
                job.getEmployerName(),
                job.getEmployerEmail(),
                job.getLocation(),
                job.getType(),
                job.getSalary(),
                job.getExperience(),
                job.getDescription(),
                job.getApplicationDeadline(),
                job.getStatus() == null ? null : job.getStatus().name(),
                job.isHidden(),
                job.getCreatedAt(),
                job.getUpdatedAt(),
                job.getDeletedAt()
        );
    }
}
