package com.internhiring.backend.service;

import com.internhiring.backend.dto.ModeratorJobResponse;
import com.internhiring.backend.entity.Job;
import com.internhiring.backend.entity.JobStatus;
import com.internhiring.backend.entity.User;
import com.internhiring.backend.repository.JobRepository;
import com.internhiring.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ModerationService {

    private static final JobStatus STATUS_PENDING_REVIEW = JobStatus.PENDING;

    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<ModeratorJobResponse> getPendingJobs() {
        return jobRepository
                .findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(STATUS_PENDING_REVIEW)
                .stream()
                .map(this::toModeratorJobResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ModeratorJobResponse getJobDetail(Long jobId) {
        Job job = findActiveJob(jobId);
        return toModeratorJobResponse(job);
    }

    @Transactional
    public ModeratorJobResponse approveJob(Long jobId) {
        Job job = findActiveJob(jobId);

        if (!STATUS_PENDING_REVIEW.equals(job.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chi co the duyet JD dang cho duyet");
        }

        job.setStatus(JobStatus.APPROVED);
        job.setUpdatedAt(LocalDateTime.now());

        Job savedJob = jobRepository.save(job);
        notifyRecruiter(savedJob, "JD da duoc duyet",
                "Tin tuyen dung \"" + savedJob.getTitle() + "\" da duoc duyet va hien thi voi ung vien.",
                "JOB_APPROVED");

        Long recruiterId = savedJob.getRecruiter().getId();
        long approvedCount = jobRepository.countByRecruiterIdAndStatus(recruiterId, JobStatus.APPROVED);

        if (approvedCount >= 5) {
            userRepository.findById(recruiterId).ifPresent(recruiter -> {
                if (!recruiter.isTrusted()) {
                    recruiter.setTrusted(true);
                    userRepository.save(recruiter);
                }
            });
        }

        return toModeratorJobResponse(savedJob);
    }

    @Transactional
    public ModeratorJobResponse rejectJob(Long jobId) {
        Job job = findActiveJob(jobId);

        if (!STATUS_PENDING_REVIEW.equals(job.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chi co the tu choi JD dang cho duyet");
        }

        job.setStatus(JobStatus.REJECTED);
        job.setUpdatedAt(LocalDateTime.now());

        Job savedJob = jobRepository.save(job);
        notifyRecruiter(savedJob, "JD da bi tu choi",
                "Tin tuyen dung \"" + savedJob.getTitle() + "\" chua duoc duyet. Vui long kiem tra va chinh sua noi dung.",
                "JOB_REJECTED");
        return toModeratorJobResponse(savedJob);
    }

    private void notifyRecruiter(Job job, String title, String message, String type) {
        User recruiter = job.getRecruiter();
        if (recruiter != null) {
            notificationService.sendJobNotification(recruiter, job, title, message, type);
        }
    }

    private Job findActiveJob(Long jobId) {
        return jobRepository.findByIdAndDeletedAtIsNull(jobId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Khong tim thay JD"));
    }

    private ModeratorJobResponse toModeratorJobResponse(Job job) {
        User recruiter = job.getRecruiter();

        return new ModeratorJobResponse(
                job.getId(),
                job.getTitle(),
                job.getDescription(),
                job.getCompany(),
                job.getLocation(),
                job.getSalary(),
                job.getType(),
                job.getExperience(),
                job.getStatus() != null ? job.getStatus().name() : null,
                job.isHidden(),
                recruiter != null ? recruiter.getId() : null,
                recruiter != null ? fullName(recruiter) : null,
                job.getEmployerName(),
                job.getEmployerEmail(),
                job.getCreatedAt(),
                job.getUpdatedAt()
        );
    }

    private static String fullName(User user) {
        String firstName = user.getFirstName() != null ? user.getFirstName() : "";
        String lastName = user.getLastName() != null ? user.getLastName() : "";
        String fullName = (firstName + " " + lastName).trim();

        return fullName.isBlank() ? user.getEmail() : fullName;
    }
}
