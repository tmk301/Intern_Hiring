package com.internhiring.backend.service;

import com.internhiring.backend.dto.AdminJobRequest;
import com.internhiring.backend.dto.AdminJobResponse;
import com.internhiring.backend.dto.JobResponse;
import com.internhiring.backend.entity.Job;
import com.internhiring.backend.entity.JobStatus;
import com.internhiring.backend.entity.User;
import com.internhiring.backend.exception.ResourceNotFoundException;
import com.internhiring.backend.repository.JobRepository;
import com.internhiring.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;
    private final UserRepository userRepository;

    public List<AdminJobResponse> getJobs(boolean includeTrash) {
        List<Job> jobs = includeTrash
                ? jobRepository.findAllByOrderByCreatedAtDesc()
                : jobRepository.findByDeletedAtIsNullOrderByCreatedAtDesc();
        return jobs.stream().map(this::toResponse).toList();
    }

    @Transactional
    public AdminJobResponse createJob(AdminJobRequest request) {
        Job job = new Job();
        applyRequest(job, request);
        job.setStatus(JobStatus.APPROVED);
        job.setHidden(false);
        job.setDeletedAt(null);
        return toResponse(jobRepository.save(job));
    }

    @Transactional
    public AdminJobResponse trashJob(Long id) {
        Job job = findJob(id);
        job.setDeletedAt(LocalDateTime.now());
        return toResponse(jobRepository.save(job));
    }

    @Transactional
    public AdminJobResponse restoreJob(Long id) {
        Job job = findJob(id);
        job.setDeletedAt(null);
        return toResponse(jobRepository.save(job));
    }

    @Transactional
    public void deleteJobPermanently(Long id) {
        Job job = findJob(id);
        if (job.getDeletedAt() == null) {
            throw new IllegalArgumentException("Trash job before permanent delete");
        }
        jobRepository.delete(job);
    }

    @Transactional
    public List<JobResponse> getAvailableJobs() {
        hideExpiredJobs();
        List<Job> jobs = jobRepository.findByDeletedAtIsNullAndHiddenFalseAndStatusOrderByCreatedAtDesc(JobStatus.APPROVED);
        return jobs.stream().map(this::toPublicResponse).toList();
    }

    private void hideExpiredJobs() {
        List<Job> expiredJobs = jobRepository.findByDeletedAtIsNullAndHiddenFalseAndApplicationDeadlineBefore(LocalDate.now());
        if (expiredJobs.isEmpty()) return;

        expiredJobs.forEach((job) -> job.setHidden(true));
        jobRepository.saveAll(expiredJobs);
    }

    private Job findJob(Long id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + id));
    }

    private void applyRequest(Job job, AdminJobRequest request) {
        User recruiter = request.recruiterId() == null
                ? null
                : userRepository.findById(request.recruiterId())
                .orElseThrow(() -> new ResourceNotFoundException("Recruiter not found: " + request.recruiterId()));

        job.setTitle(request.title().trim());
        job.setCompany(trimToNull(request.company()));
        job.setRecruiter(recruiter);
        job.setEmployerName(trimToNull(request.employerName()));
        job.setEmployerEmail(trimToNull(request.employerEmail()));
        job.setLocation(trimToNull(request.location()));
        job.setType(trimToNull(request.type()));
        job.setSalary(trimToNull(request.salary()));
        job.setExperience(trimToNull(request.experience()));
        job.setApplicationDeadline(request.applicationDeadline());
        job.setDescription(trimToNull(request.description()));
    }

    public AdminJobResponse toResponse(Job job) {
        User recruiter = job.getRecruiter();
        return new AdminJobResponse(
                job.getId(),
                job.getTitle(),
                job.getCompany(),
                recruiter == null ? null : recruiter.getId(),
                firstPresent(job.getEmployerName(), recruiter == null ? null : fullName(recruiter)),
                firstPresent(job.getEmployerEmail(), recruiter == null ? null : recruiter.getEmail()),
                job.getLocation(),
                job.getType(),
                job.getSalary(),
                job.getExperience(),
                job.getApplicationDeadline(),
                job.getStatus(),
                job.isHidden(),
                job.getDescription(),
                job.getCreatedAt(),
                job.getDeletedAt());
    }

    // Chỉ trả về những việc làm đã được duyệt và chưa bị xóa (user)
    private JobResponse toPublicResponse(Job job) {
        User recruiter = job.getRecruiter();
        return new JobResponse(
                job.getId(),
                job.getTitle(),
                job.getCompany(),
                firstPresent(job.getEmployerName(), recruiter == null ? null : fullName(recruiter)),
                firstPresent(job.getEmployerEmail(), recruiter == null ? null : recruiter.getEmail()),
                job.getLocation(),
                job.getType(),
                job.getSalary(),
                job.getExperience(),
                job.getDescription(),
                job.getApplicationDeadline(),
                job.getStatus(),
                job.isHidden(),
                recruiter == null ? null : recruiter.getId(),
                job.getCreatedAt(),
                job.getUpdatedAt(),
                job.getDeletedAt()
        );
    }

    private String fullName(User user) {
        return String.join(" ",
                firstPresent(user.getLastName(), ""),
                firstPresent(user.getFirstName(), "")).trim();
    }

    private String firstPresent(String preferred, String fallback) {
        return preferred == null || preferred.isBlank() ? fallback : preferred;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
