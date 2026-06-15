package com.internhiring.backend.controller;

import com.internhiring.backend.dto.AdminJobRequest;
import com.internhiring.backend.dto.AdminJobResponse;
import com.internhiring.backend.dto.AuditLogResponse;
import com.internhiring.backend.dto.CompanyResponse;
import com.internhiring.backend.dto.UpdateRestrictionRequest;
import com.internhiring.backend.dto.UpdateUserRoleRequest;
import com.internhiring.backend.dto.UserResponse;
import com.internhiring.backend.entity.AuditAction;
import com.internhiring.backend.entity.AuditTargetType;
import com.internhiring.backend.entity.Role;
import com.internhiring.backend.entity.User;
import com.internhiring.backend.exception.UserNotFoundException;
import com.internhiring.backend.service.AuditLogService;
import com.internhiring.backend.service.JobService;
import com.internhiring.backend.service.RecruiterApplicationService;
import com.internhiring.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.internhiring.backend.dto.UserTrustedRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserService userService;
    private final JobService jobService;
    private final AuditLogService auditLogService;
    private final RecruiterApplicationService recruiterApplicationService;

    @GetMapping("/users")
    public List<UserResponse> getUsers() {
        return userService.getAllUsers();
    }

    @GetMapping("/users/{id}")
    public UserResponse getUser(@PathVariable Long id) {
        User user = userService.getUserById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));
        return userService.mapToUserResponse(user);
    }

    @GetMapping("/users/{id}/company")
    public CompanyResponse getUserCompany(@PathVariable Long id) {
        return recruiterApplicationService.getCompanyProfileByRecruiterId(id);
    }

    @PatchMapping("/users/{id}/role")
    public UserResponse updateUserRole(@PathVariable Long id, @Valid @RequestBody UpdateUserRoleRequest request) {
        Role previousRole = userService.getUserById(id).map(User::getRole).orElse(null);
        User updatedUser = userService.updateUserRole(id, request.getRole());
        auditLogService.record(
                AuditAction.USER_ROLE_UPDATED,
                AuditTargetType.USER,
                id,
                "Updated user role for " + updatedUser.getEmail(),
                Map.of(
                        "email", updatedUser.getEmail(),
                        "previousRole", previousRole == null ? "" : previousRole.name(),
                        "newRole", updatedUser.getRole().name()));
        return userService.mapToUserResponse(updatedUser);
    }

    @PatchMapping("/users/{id}/restriction")
    public UserResponse updateUserRestriction(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRestrictionRequest request,
            Authentication authentication) {
        User updatedUser = userService.setUserRestriction(id, request.getRestricted(), authentication.getName());
        auditLogService.record(
                AuditAction.USER_RESTRICTION_UPDATED,
                AuditTargetType.USER,
                id,
                (request.getRestricted() ? "Restricted " : "Unrestricted ") + updatedUser.getEmail(),
                Map.of("email", updatedUser.getEmail(), "restricted", String.valueOf(updatedUser.isRestricted())));
        return userService.mapToUserResponse(updatedUser);
    }

    @GetMapping("/jobs")
    public List<AdminJobResponse> getJobs(@RequestParam(defaultValue = "true") boolean includeTrash) {
        return jobService.getJobs(includeTrash);
    }

    @PostMapping("/jobs")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminJobResponse createJob(@Valid @RequestBody AdminJobRequest request) {
        AdminJobResponse response = jobService.createJob(request);
        auditLogService.record(
                AuditAction.ADMIN_JOB_CREATED,
                AuditTargetType.JOB,
                response.id(),
                "Created admin job " + response.title(),
                Map.of("title", response.title(), "company", nullToEmpty(response.company())));
        return response;
    }

    @PatchMapping("/jobs/{id}/trash")
    public AdminJobResponse trashJob(@PathVariable Long id) {
        AdminJobResponse response = jobService.trashJob(id);
        auditLogService.record(
                AuditAction.ADMIN_JOB_TRASHED,
                AuditTargetType.JOB,
                id,
                "Moved job to trash " + response.title(),
                Map.of("title", response.title()));
        return response;
    }

    @PatchMapping("/jobs/{id}/restore")
    public AdminJobResponse restoreJob(@PathVariable Long id) {
        AdminJobResponse response = jobService.restoreJob(id);
        auditLogService.record(
                AuditAction.ADMIN_JOB_RESTORED,
                AuditTargetType.JOB,
                id,
                "Restored job " + response.title(),
                Map.of("title", response.title()));
        return response;
    }

    @DeleteMapping("/jobs/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteJobPermanently(@PathVariable Long id) {
        jobService.deleteJobPermanently(id);
        auditLogService.record(
                AuditAction.ADMIN_JOB_DELETED,
                AuditTargetType.JOB,
                id,
                "Permanently deleted job " + id,
                Map.of("jobId", String.valueOf(id)));
    }

    @GetMapping("/audit-logs")
    public Page<AuditLogResponse> getAuditLogs(
            @RequestParam(required = false) AuditAction action,
            @RequestParam(required = false) AuditTargetType targetType,
            @RequestParam(required = false) String actorEmail,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageRequest = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        return auditLogService.list(action, targetType, actorEmail, from, to, pageRequest);
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    @PatchMapping("/users/{userId}/trusted")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> setUserTrusted(
            @PathVariable Long userId,
            @RequestBody UserTrustedRequest request) {
        try {
            userService.setUserTrusted(userId, request.isTrusted());
            return ResponseEntity.ok(Map.of(
                "message", "Cập nhật quyền đối tác uy tín thành công!", 
                "isTrusted", request.isTrusted()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
