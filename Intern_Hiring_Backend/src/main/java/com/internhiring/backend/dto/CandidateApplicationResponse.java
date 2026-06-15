package com.internhiring.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class CandidateApplicationResponse {
    private Long id;
    private Long jobId;
    private String jobTitle;
    private String company;
    private String location;
    private String salary;
    private String jobType;
    private Long applicantId;
    private String applicantName;
    private String applicantEmail;
    private String appliedCvUrl;
    private String status;
    private LocalDateTime appliedAt;
}