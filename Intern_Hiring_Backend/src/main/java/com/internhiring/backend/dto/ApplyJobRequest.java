package com.internhiring.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApplyJobRequest {

    @NotBlank(message = "ID của CV không được để trống")
    private String cvId;

}