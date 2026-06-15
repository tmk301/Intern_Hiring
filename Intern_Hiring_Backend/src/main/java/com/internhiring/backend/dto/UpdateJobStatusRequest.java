package com.internhiring.backend.dto;

import com.internhiring.backend.entity.JobStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateJobStatusRequest(@NotNull JobStatus status) {
}
