package com.internhiring.backend.controller;

import com.internhiring.backend.dto.ApplyJobRequest;
import com.internhiring.backend.dto.CandidateApplicationResponse;
import com.internhiring.backend.service.JobApplicationService;
import com.internhiring.backend.security.AuthenticatedUser; // Đổi lại import này cho khớp với class bảo mật dự án của bạn
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/candidates")
@RequiredArgsConstructor
public class CandidateJobController {

    private final JobApplicationService applicationService;

    @GetMapping("/applications")
    @PreAuthorize("hasRole('CANDIDATE')")
    public ResponseEntity<List<CandidateApplicationResponse>> getMyApplications(
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(applicationService.getMyApplications(principal.getId(), status));
    }

    @PostMapping("/jobs/{jobId}/apply")
    @PreAuthorize("hasRole('CANDIDATE')") // Chỉ ứng viên mới được nộp đơn
    public ResponseEntity<?> applyJob(
            @PathVariable Long jobId,
            @Valid @RequestBody ApplyJobRequest request,
            @AuthenticationPrincipal AuthenticatedUser principal) { // Sử dụng class chứa thông tin User đăng nhập của bạn

        try {
            applicationService.applyForJob(jobId, principal.getId(), request);
            return ResponseEntity.ok(Map.of("message", "Nộp đơn thành công!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}