package com.internhiring.backend.dto;


import java.time.LocalDateTime;

public record ModeratorJobResponse(
        Long id,
        String title,
        String description,
        String company,
        String location,
        String salary,
        String type,
        String experience,
        String status,
        boolean hidden,
        Long recruiterId,
        String recruiterName,
        String employerName,
        String employerEmail,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
){}
