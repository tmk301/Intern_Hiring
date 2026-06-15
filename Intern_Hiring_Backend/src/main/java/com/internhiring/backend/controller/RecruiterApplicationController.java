package com.internhiring.backend.controller;

import com.internhiring.backend.dto.RecruiterApplicationRequest;
import com.internhiring.backend.dto.RecruiterApplicationResponse;
import com.internhiring.backend.dto.RecruiterApplicationReviewRequest;
import com.internhiring.backend.dto.RecruiterFormFieldRequest;
import com.internhiring.backend.dto.RecruiterFormFieldResponse;
import com.internhiring.backend.dto.CompanyResponse;
import com.internhiring.backend.entity.AuditAction;
import com.internhiring.backend.entity.AuditTargetType;
import com.internhiring.backend.entity.RecruiterApplicationStatus;
import com.internhiring.backend.entity.User;
import com.internhiring.backend.repository.UserRepository;
import com.internhiring.backend.security.AuthenticatedUser;
import com.internhiring.backend.service.AuditLogService;
import com.internhiring.backend.service.RecruiterApplicationService;
import com.internhiring.backend.service.RecruiterFormFieldService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.internhiring.backend.dto.CandidateApplicationResponse;
import com.internhiring.backend.dto.UpdateApplicationStatusRequest;
import org.springframework.web.bind.annotation.PatchMapping;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recruiter")
@RequiredArgsConstructor
public class RecruiterApplicationController {

    private final RecruiterFormFieldService fieldService;
    private final RecruiterApplicationService applicationService;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @GetMapping("/form-fields")
    public ResponseEntity<List<RecruiterFormFieldResponse>> getFields(
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return ResponseEntity.ok(fieldService.getFields(includeInactive));
    }

    @PostMapping("/form-fields")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RecruiterFormFieldResponse> createField(@Valid @RequestBody RecruiterFormFieldRequest request) {
        RecruiterFormFieldResponse response = fieldService.create(request);
        auditLogService.record(
                AuditAction.RECRUITER_FORM_FIELD_CREATED,
                AuditTargetType.RECRUITER_FORM_FIELD,
                response.id(),
                "Created recruiter form field " + response.label(),
                Map.of("name", response.name(), "label", response.label()));
        return ResponseEntity.ok(response);
    }

    @PutMapping("/form-fields/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RecruiterFormFieldResponse> updateField(
            @PathVariable Long id,
            @Valid @RequestBody RecruiterFormFieldRequest request) {
        RecruiterFormFieldResponse response = fieldService.update(id, request);
        auditLogService.record(
                AuditAction.RECRUITER_FORM_FIELD_UPDATED,
                AuditTargetType.RECRUITER_FORM_FIELD,
                id,
                "Updated recruiter form field " + response.label(),
                Map.of("name", response.name(), "label", response.label()));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/form-fields/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteField(@PathVariable Long id) {
        fieldService.delete(id);
        auditLogService.record(
                AuditAction.RECRUITER_FORM_FIELD_DELETED,
                AuditTargetType.RECRUITER_FORM_FIELD,
                id,
                "Deleted recruiter form field " + id,
                Map.of("fieldId", String.valueOf(id)));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/applications")
    @PreAuthorize("hasAnyRole('CANDIDATE', 'RECRUITER')")
    public ResponseEntity<RecruiterApplicationResponse> submit(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody RecruiterApplicationRequest request) {
        return ResponseEntity.ok(applicationService.submit(currentUser(principal), request));
    }

    @GetMapping("/company")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<CompanyResponse> getCompanyProfile(
            @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(applicationService.getCompanyProfile(currentUser(principal)));
    }

    @GetMapping("/applications")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RecruiterApplicationResponse>> list(
            @RequestParam(required = false) RecruiterApplicationStatus status) {
        return ResponseEntity.ok(applicationService.getApplications(status));
    }

    @GetMapping("/applications/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RecruiterApplicationResponse> getApplication(@PathVariable Long id) {
        return ResponseEntity.ok(applicationService.getApplication(id));
    }

    @PostMapping("/applications/{id}/review")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RecruiterApplicationResponse> review(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody RecruiterApplicationReviewRequest request) {
        RecruiterApplicationResponse response = applicationService.review(id, currentUser(principal), request);
        boolean approved = Boolean.TRUE.equals(request.approved());
        auditLogService.record(
                approved ? AuditAction.RECRUITER_APPLICATION_APPROVED : AuditAction.RECRUITER_APPLICATION_REJECTED,
                AuditTargetType.RECRUITER_APPLICATION,
                id,
                (approved ? "Approved" : "Rejected") + " recruiter application from " + response.applicantEmail(),
                Map.of("applicantEmail", response.applicantEmail(), "status", response.status().name()));
        return ResponseEntity.ok(response);
    }

    private User currentUser(AuthenticatedUser principal) {
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Authenticated user not found"));
    }

    // Duyet CV
    @GetMapping("/jobs/{jobId}/applications")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<List<CandidateApplicationResponse>> getJobApplications(
            @PathVariable Long jobId,
            @AuthenticationPrincipal AuthenticatedUser principal) {

        List<CandidateApplicationResponse> responses = applicationService.getApplicationsForJob(jobId, principal.getId());
        return ResponseEntity.ok(responses);
    }

    @PatchMapping("/jobs/{jobId}/applications/{applicationId}/status")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<?> updateJobApplicationStatus(
            @PathVariable Long jobId,
            @PathVariable Long applicationId,
            @Valid @RequestBody UpdateApplicationStatusRequest request,
            @AuthenticationPrincipal AuthenticatedUser principal) {

        try {
            applicationService.updateApplicationStatus(jobId, applicationId, request.getStatus(), principal.getId());
            return ResponseEntity.ok(Map.of("message", "Cập nhật trạng thái thành công"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
