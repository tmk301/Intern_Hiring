package com.internhiring.backend.controller;

import com.internhiring.backend.dto.JobChangeLogResponse;
import com.internhiring.backend.dto.RecruiterJobRequest;
import com.internhiring.backend.dto.RecruiterJobResponse;
import com.internhiring.backend.dto.UpdateJobHiddenRequest;
import com.internhiring.backend.entity.User;
import com.internhiring.backend.repository.UserRepository;
import com.internhiring.backend.security.AuthenticatedUser;
import com.internhiring.backend.service.RecruiterJobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/recruiter/jobs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RECRUITER')")
public class RecruiterJobController {

    private final RecruiterJobService recruiterJobService;
    private final UserRepository userRepository;

    @GetMapping
    public List<RecruiterJobResponse> listJobs(@AuthenticationPrincipal AuthenticatedUser principal) {
        return recruiterJobService.listJobs(currentUser(principal));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RecruiterJobResponse createJob(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody RecruiterJobRequest request) {
        return recruiterJobService.createJob(currentUser(principal), request);
    }

    @PatchMapping("/{id}/hidden")
    public RecruiterJobResponse updateHidden(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Long id,
            @Valid @RequestBody UpdateJobHiddenRequest request) {
        return recruiterJobService.updateHidden(currentUser(principal), id, request.hidden());
    }

    @PutMapping("/{id}")
    public RecruiterJobResponse updateJob(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Long id,
            @Valid @RequestBody RecruiterJobRequest request) {
        return recruiterJobService.updateJob(currentUser(principal), id, request);
    }

    @GetMapping("/{id}/change-logs")
    public List<JobChangeLogResponse> listChangeLogs(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Long id) {
        return recruiterJobService.listChangeLogs(currentUser(principal), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void trashJob(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
        recruiterJobService.trashJob(currentUser(principal), id);
    }

    private User currentUser(AuthenticatedUser principal) {
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Authenticated user not found"));
    }
}
