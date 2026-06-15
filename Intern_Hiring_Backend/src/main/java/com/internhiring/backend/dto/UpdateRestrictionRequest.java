package com.internhiring.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateRestrictionRequest {
    @NotNull
    private Boolean restricted;
}
