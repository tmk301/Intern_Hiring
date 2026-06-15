package com.internhiring.backend.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateJobHiddenRequest(@NotNull Boolean hidden) {
}
