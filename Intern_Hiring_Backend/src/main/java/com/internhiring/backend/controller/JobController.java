package com.internhiring.backend.controller;

import com.internhiring.backend.dto.JobResponse;
import com.internhiring.backend.service.JobService;
import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    @GetMapping
    public List<JobResponse> getAllPublicJobs() {
        return jobService.getAvailableJobs();
    }
}