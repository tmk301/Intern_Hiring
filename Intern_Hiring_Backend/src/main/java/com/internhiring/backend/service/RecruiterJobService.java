package com.internhiring.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.internhiring.backend.dto.JobChangeLogResponse;
import com.internhiring.backend.dto.RecruiterJobRequest;
import com.internhiring.backend.dto.RecruiterJobResponse;
import com.internhiring.backend.entity.Company;
import com.internhiring.backend.entity.Job;
import com.internhiring.backend.entity.JobChangeLog;
import com.internhiring.backend.entity.JobStatus;
import com.internhiring.backend.entity.Role;
import com.internhiring.backend.entity.User;
import com.internhiring.backend.exception.ResourceNotFoundException;
import com.internhiring.backend.repository.CompanyRepository;
import com.internhiring.backend.repository.JobChangeLogRepository;
import com.internhiring.backend.repository.JobRepository;
import com.internhiring.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.regex.Pattern;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class RecruiterJobService {

    private final JobRepository jobRepository;
    private final JobChangeLogRepository jobChangeLogRepository;
    private final CompanyRepository companyRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Transactional
    public List<RecruiterJobResponse> listJobs(User recruiter) {
        hideExpiredJobs();
        return jobRepository.findByRecruiterIdAndDeletedAtIsNullOrderByCreatedAtDesc(recruiter.getId())
                .stream()
                .map(RecruiterJobResponse::from)
                .toList();
    }

    private void hideExpiredJobs() {
        List<Job> expiredJobs = jobRepository.findByDeletedAtIsNullAndHiddenFalseAndApplicationDeadlineBefore(LocalDate.now());
        if (expiredJobs.isEmpty()) return;

        expiredJobs.forEach((job) -> job.setHidden(true));
        jobRepository.saveAll(expiredJobs);
    }

    @Transactional
    public RecruiterJobResponse createJob(User recruiter, RecruiterJobRequest request) {
        Job job = new Job();
        job.setRecruiter(recruiter);
        applyRequest(job, recruiter, request);

        boolean hasBlacklistedKeywords = containsBlacklistedKeywords(job.getTitle())
                || containsBlacklistedKeywords(job.getDescription());

        if (recruiter.isTrusted() == true && !hasBlacklistedKeywords) {
            job.setStatus(JobStatus.APPROVED);
        } else {
            job.setStatus(JobStatus.PENDING);
        }

        job.setHidden(false);
        job.setDeletedAt(null);

        Job savedJob = jobRepository.save(job);
        notifyJobCreated(recruiter, savedJob);
        return RecruiterJobResponse.from(savedJob);
    }

    private void notifyJobCreated(User recruiter, Job job) {
        if (JobStatus.APPROVED.equals(job.getStatus())) {
            notificationService.sendJobNotification(
                    recruiter,
                    job,
                    "JD đã được đăng",
                    "Tin tuyển dụng \"" + job.getTitle() + "\" đã được duyệt tự động và hiển thị với ứng viên.",
                    "JOB_APPROVED"
            );
            return;
        }

        notificationService.sendJobNotification(
                recruiter,
                job,
                "JD đang chờ duyệt",
                "Tin tuyển dụng \"" + job.getTitle() + "\" đã được gửi và đang chờ Admin/Moderator duyệt.",
                "JOB_PENDING_REVIEW"
        );

        userRepository.findByRoleIn(List.of(Role.ADMIN, Role.MODERATOR)).forEach(reviewer ->
                notificationService.sendJobNotification(
                        reviewer,
                        job,
                        "Có JD mới chờ duyệt",
                        recruiter.getEmail() + " vừa đăng JD \"" + job.getTitle() + "\".",
                        "JOB_REVIEW_REQUEST"
                )
        );
    }

    //Xử lý blacklist từ khóa trong title, description
    private static final Pattern BLACKLIST_PATTERN = Pattern.compile(
        "(?i)(cá độ|đa cấp|cọc tiền|nạp tiền|tài xỉu|cờ bạc|lừa đảo|tín dụng đen)"
    );

    private boolean containsBlacklistedKeywords(String text) {
        if (text == null || text.isBlank()) return false;
        return BLACKLIST_PATTERN.matcher(text).find();
    }

    @Transactional
    public RecruiterJobResponse updateHidden(User recruiter, Long id, boolean hidden) {
        Job job = findOwnJob(recruiter, id);
        job.setHidden(hidden);
        job.setDeletedAt(null);
        return RecruiterJobResponse.from(jobRepository.save(job));
    }

    @Transactional
    public RecruiterJobResponse updateJob(User recruiter, Long id, RecruiterJobRequest request) {
        Job job = findOwnJob(recruiter, id);
        Map<String, Object> previousData = snapshotJob(job);

        applyRequest(job, recruiter, request);
        job.setDeletedAt(null);

        Map<String, Object> newData = snapshotJob(job);
        List<String> changedFields = changedFields(previousData, newData);
        if (!changedFields.isEmpty()) {
            saveChangeLog(job, recruiter, previousData, newData, changedFields);
        }

        return RecruiterJobResponse.from(jobRepository.save(job));
    }

    @Transactional(readOnly = true)
    public List<JobChangeLogResponse> listChangeLogs(User recruiter, Long id) {
        findOwnJob(recruiter, id);
        return jobChangeLogRepository.findByJobIdAndJobRecruiterIdOrderByCreatedAtDesc(id, recruiter.getId())
                .stream()
                .map(JobChangeLogResponse::from)
                .toList();
    }

    @Transactional
    public void trashJob(User recruiter, Long id) {
        Job job = findOwnJob(recruiter, id);
        job.setDeletedAt(LocalDateTime.now());
        jobRepository.save(job);
    }

    private Job findOwnJob(User recruiter, Long id) {
        return jobRepository.findByIdAndRecruiterIdAndDeletedAtIsNull(id, recruiter.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + id));
    }

    private void saveChangeLog(Job job, User actor, Map<String, Object> previousData, Map<String, Object> newData, List<String> changedFields) {
        JobChangeLog log = new JobChangeLog();
        log.setJob(job);
        log.setActor(actor);
        log.setPreviousData(writeJson(previousData));
        log.setNewData(writeJson(newData));
        log.setChangedFields(writeJson(changedFields));
        jobChangeLogRepository.save(log);
    }

    private Map<String, Object> snapshotJob(Job job) {
        return Map.of(
                "title", valueOrEmpty(job.getTitle()),
                "location", valueOrEmpty(job.getLocation()),
                "type", valueOrEmpty(job.getType()),
                "salary", valueOrEmpty(job.getSalary()),
                "experience", valueOrEmpty(job.getExperience()),
                "applicationDeadline", job.getApplicationDeadline() == null ? "" : job.getApplicationDeadline().toString(),
                "description", valueOrEmpty(job.getDescription())
        );
    }

    private List<String> changedFields(Map<String, Object> previousData, Map<String, Object> newData) {
        return newData.keySet().stream()
                .filter(field -> !Objects.equals(previousData.get(field), newData.get(field)))
                .toList();
    }

    private String writeJson(Object value) {
        try {
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to serialize job change log", exception);
        }
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    private void applyRequest(Job job, User recruiter, RecruiterJobRequest request) {
        Company company = companyRepository.findByRecruiterId(recruiter.getId())
                .orElseThrow(() -> new IllegalStateException("Company profile must be approved before posting jobs"));

        job.setTitle(request.title().trim());
        job.setCompany(firstPresent(company.getCompanyDisplayName(), company.getCompanyFullName()));
        job.setEmployerName(firstPresent(fullName(recruiter), recruiter.getEmail()));
        job.setEmployerEmail(recruiter.getEmail());
        job.setLocation(resolveRegisteredLocation(company, request.location()));
        job.setType(trimToNull(request.type()));
        job.setSalary(trimToNull(request.salary()));
        job.setExperience(trimToNull(request.experience()));
        job.setApplicationDeadline(request.applicationDeadline());
        job.setDescription(trimToNull(request.description()));
    }

    private String resolveRegisteredLocation(Company company, String requestedLocation) {
        List<String> registeredLocations = getRegisteredLocations(company);

        if (registeredLocations.isEmpty()) {
            String billingAddress = trimToNull(company.getBillingAddress());
            if (billingAddress != null) return billingAddress;
            throw new IllegalStateException("Company profile has no registered work address");
        }

        String normalizedRequestedLocation = trimToNull(requestedLocation);
        if (normalizedRequestedLocation == null) {
            return registeredLocations.get(0);
        }

        return registeredLocations.stream()
                .filter(location -> location.equalsIgnoreCase(normalizedRequestedLocation))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Work address must be one of the registered company branches"));
    }

    private List<String> getRegisteredLocations(Company company) {
        String addresses = trimToNull(company.getAddresses());
        if (addresses == null) return List.of();

        try {
            List<Map<String, Object>> parsedAddresses = OBJECT_MAPPER.readValue(addresses, new TypeReference<>() {});
            return parsedAddresses.stream()
                    .map(this::formatCompanyAddress)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private String formatCompanyAddress(Map<String, Object> address) {
        String headOffice = asString(address.get("headOffice"));
        String detail = asString(address.get("detail"));
        String district = asString(address.get("district"));
        String province = asString(address.get("province"));

        String location = Stream.of(headOffice, detail, district, province)
                .filter(value -> value != null && !value.isBlank())
                .collect(Collectors.joining(", "));

        return location.isBlank() ? null : location;
    }

    private String asString(Object value) {
        if (value == null) return null;
        String text = String.valueOf(value).trim();
        return text.isBlank() ? null : text;
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
