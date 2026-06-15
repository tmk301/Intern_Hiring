package com.internhiring.backend.controller;

import com.internhiring.backend.dto.ModeratorJobResponse;
import com.internhiring.backend.entity.AuditAction;
import com.internhiring.backend.entity.AuditTargetType;
import com.internhiring.backend.service.AuditLogService;
import com.internhiring.backend.service.ModerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/moderator/jobs")
@RequiredArgsConstructor
public class ModeratorJobController {

    private final ModerationService jobModerationService;
    private final AuditLogService auditLogService;

    @GetMapping("/pending")
    public List<ModeratorJobResponse> getPendingJobs() {
        return jobModerationService.getPendingJobs();
    }

    @GetMapping("/{jobId}")
    public ModeratorJobResponse getJobDetail(@PathVariable Long jobId) {
        return jobModerationService.getJobDetail(jobId);
    }

    @PatchMapping("/{jobId}/approve")
    public ModeratorJobResponse approveJob(@PathVariable Long jobId) {
        ModeratorJobResponse response = jobModerationService.approveJob(jobId);
        auditLogService.record(
                AuditAction.JOB_APPROVED,
                AuditTargetType.JOB,
                jobId,
                "Approved job " + response.title(),
                Map.of("title", response.title()));
        return response;
    }

    @PatchMapping("/{jobId}/reject")
    public ModeratorJobResponse rejectJob(@PathVariable Long jobId) {
        ModeratorJobResponse response = jobModerationService.rejectJob(jobId);
        auditLogService.record(
                AuditAction.JOB_REJECTED,
                AuditTargetType.JOB,
                jobId,
                "Rejected job " + response.title(),
                Map.of("title", response.title()));
        return response;
    }
}
