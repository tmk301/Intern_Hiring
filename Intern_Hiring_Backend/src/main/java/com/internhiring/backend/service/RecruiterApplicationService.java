package com.internhiring.backend.service;

import com.internhiring.backend.dto.RecruiterApplicationRequest;
import com.internhiring.backend.dto.RecruiterApplicationResponse;
import com.internhiring.backend.dto.RecruiterApplicationReviewRequest;
import com.internhiring.backend.dto.CompanyResponse;
import com.internhiring.backend.entity.Company;
import com.internhiring.backend.entity.RecruiterApplication;
import com.internhiring.backend.entity.RecruiterApplicationStatus;
import com.internhiring.backend.entity.Role;
import com.internhiring.backend.entity.User;
import com.internhiring.backend.repository.CompanyRepository;
import com.internhiring.backend.repository.RecruiterApplicationRepository;
import com.internhiring.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.internhiring.backend.repository.JobApplicationRepository;
import com.internhiring.backend.entity.Job;
import com.internhiring.backend.entity.JobApplication;
import com.internhiring.backend.dto.CandidateApplicationResponse;
import com.internhiring.backend.entity.JobApplicationStatus;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecruiterApplicationService {

    private final RecruiterApplicationRepository repository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final JobApplicationRepository applicationRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    private static final List<String> COMPANY_PROFILE_FIELDS = List.of(
            "logoUrl",
            "coverUrl",
            "companyFullName",
            "companyDisplayName",
            "taxCode",
            "billingAddress",
            "companySize",
            "companyPhone",
            "companyWebsite",
            "companyIntro",
            "addresses",
            "galleryUrls"
    );

    private static final Set<String> REQUIRED_COMPANY_PROFILE_FIELDS = Set.of(
            "logoUrl",
            "coverUrl",
            "companyFullName",
            "companyDisplayName",
            "taxCode",
            "billingAddress",
            "companySize",
            "companyPhone",
            "addresses"
    );

    public List<RecruiterApplicationResponse> getApplications(RecruiterApplicationStatus status) {
        List<RecruiterApplication> applications = status == null
                ? repository.findAllByOrderByCreatedAtDesc()
                : repository.findByStatusOrderByCreatedAtDesc(status);
        return applications.stream().map(this::toResponse).toList();
    }

    public RecruiterApplicationResponse getApplication(Long id) {
        RecruiterApplication application = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recruiter application not found: " + id));
        return toResponse(application);
    }

    public CompanyResponse getCompanyProfile(User recruiter) {
        Company company = companyRepository.findByRecruiterId(recruiter.getId())
                .orElseThrow(() -> new IllegalArgumentException("Company profile not found"));
        return toCompanyResponse(company);
    }

    public CompanyResponse getCompanyProfileByRecruiterId(Long recruiterId) {
        Company company = companyRepository.findByRecruiterId(recruiterId)
                .orElseThrow(() -> new IllegalArgumentException("Company profile not found"));
        return toCompanyResponse(company);
    }

    @Transactional
    public RecruiterApplicationResponse submit(User applicant, RecruiterApplicationRequest request) {
        repository.findFirstByApplicantAndStatusOrderByCreatedAtDesc(applicant, RecruiterApplicationStatus.PENDING)
                .ifPresent(existing -> {
                    throw new IllegalStateException("You already have a pending recruiter application");
                });

        Map<String, String> sanitized = validateAndSanitize(applicant, request.formData());

        RecruiterApplication application = new RecruiterApplication();
        application.setApplicant(applicant);
        application.setFormData(sanitized);
        application.setStatus(RecruiterApplicationStatus.PENDING);
        return toResponse(repository.save(application));
    }

    @Transactional
    public RecruiterApplicationResponse review(Long id, User reviewer, RecruiterApplicationReviewRequest request) {
        RecruiterApplication application = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recruiter application not found: " + id));

        if (application.getStatus() != RecruiterApplicationStatus.PENDING) {
            throw new IllegalStateException("Only pending recruiter applications can be reviewed");
        }

        application.setStatus(Boolean.TRUE.equals(request.approved())
                ? RecruiterApplicationStatus.APPROVED
                : RecruiterApplicationStatus.REJECTED);
        application.setReviewNote(request.reviewNote());
        application.setReviewedBy(reviewer);
        application.setReviewedAt(LocalDateTime.now());

        if (application.getStatus() == RecruiterApplicationStatus.APPROVED) {
            User applicant = application.getApplicant();
            applicant.setRole(Role.RECRUITER);
            userRepository.save(applicant);
            saveCompanyProfile(application, applicant);
        }

        return toResponse(repository.save(application));
    }

    private Map<String, String> validateAndSanitize(User applicant, Map<String, String> input) {
        Set<String> allowedNames = Set.copyOf(COMPANY_PROFILE_FIELDS);
        Map<String, String> result = new LinkedHashMap<>();

        for (String fieldName : COMPANY_PROFILE_FIELDS) {
            String rawValue = input.get(fieldName);
            String value = rawValue == null ? "" : rawValue.trim();

            if (REQUIRED_COMPANY_PROFILE_FIELDS.contains(fieldName) && value.isBlank()) {
                throw new IllegalArgumentException("Missing required field: " + fieldName);
            }
            result.put(fieldName, value);
        }

        for (String key : input.keySet()) {
            if (!allowedNames.contains(key)) {
                throw new IllegalArgumentException("Unknown field: " + key);
            }
        }

        validateMaxLength(result, "companyFullName", 255);
        validateMaxLength(result, "companyDisplayName", 255);
        validateMaxLength(result, "companyIntro", 5000);
        validatePattern(result, "taxCode", "[0-9-]+");
        validatePattern(result, "companyPhone", "[0-9+\\s]+");
        validateWebsite(result.get("companyWebsite"));
        validateDuplicateTaxCode(applicant, result.get("taxCode"));

        return result;
    }

    private void validateMaxLength(Map<String, String> values, String key, int maxLength) {
        String value = values.get(key);
        if (value != null && value.length() > maxLength) {
            throw new IllegalArgumentException("Field too long: " + key);
        }
    }

    private void validatePattern(Map<String, String> values, String key, String regex) {
        String value = values.get(key);
        if (value != null && !value.isBlank() && !value.matches(regex)) {
            throw new IllegalArgumentException("Invalid format for field: " + key);
        }
    }

    private void validateWebsite(String value) {
        if (value == null || value.isBlank()) return;

        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme();
            if (!Arrays.asList("http", "https").contains(scheme) || uri.getHost() == null) {
                throw new IllegalArgumentException("Invalid format for field: companyWebsite");
            }
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("Invalid format for field: companyWebsite");
        }
    }

    private void validateDuplicateTaxCode(User applicant, String taxCode) {
        if (taxCode == null || taxCode.isBlank()) return;

        if (companyRepository.existsByTaxCodeIgnoreCaseAndRecruiterIdNot(taxCode, applicant.getId())) {
            throw new IllegalArgumentException("Mã số thuế này đã được đăng ký");
        }

        boolean duplicate = repository.findAll().stream()
                .filter(application -> !application.getApplicant().getId().equals(applicant.getId()))
                .filter(application -> application.getStatus() == RecruiterApplicationStatus.PENDING
                        || application.getStatus() == RecruiterApplicationStatus.APPROVED)
                .map(application -> application.getFormData().get("taxCode"))
                .anyMatch(existingTaxCode -> existingTaxCode != null && taxCode.equalsIgnoreCase(existingTaxCode));

        if (duplicate) {
            throw new IllegalArgumentException("Mã số thuế này đã được đăng ký");
        }
    }

    private void saveCompanyProfile(RecruiterApplication application, User recruiter) {
        Map<String, String> formData = application.getFormData();
        Company company = companyRepository.findByRecruiterId(recruiter.getId()).orElseGet(Company::new);

        company.setRecruiter(recruiter);
        company.setRecruiterApplication(application);
        company.setLogoUrl(requiredValue(formData, "logoUrl"));
        company.setCoverUrl(requiredValue(formData, "coverUrl"));
        company.setCompanyFullName(requiredValue(formData, "companyFullName"));
        company.setCompanyDisplayName(requiredValue(formData, "companyDisplayName"));
        company.setTaxCode(requiredValue(formData, "taxCode"));
        company.setBillingAddress(requiredValue(formData, "billingAddress"));
        company.setCompanySize(requiredValue(formData, "companySize"));
        company.setCompanyPhone(requiredValue(formData, "companyPhone"));
        company.setCompanyWebsite(blankToNull(formData.get("companyWebsite")));
        company.setCompanyIntro(blankToNull(formData.get("companyIntro")));
        company.setAddresses(requiredValue(formData, "addresses"));
        company.setGalleryUrls(blankToNull(formData.get("galleryUrls")));

        companyRepository.save(company);
    }

    private String requiredValue(Map<String, String> formData, String key) {
        String value = formData.get(key);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Missing required field: " + key);
        }
        return value.trim();
    }

    private String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private RecruiterApplicationResponse toResponse(RecruiterApplication application) {
        User reviewedBy = application.getReviewedBy();
        return new RecruiterApplicationResponse(
                application.getId(),
                application.getApplicant().getId(),
                application.getApplicant().getEmail(),
                application.getFormData(),
                application.getStatus(),
                application.getReviewNote(),
                reviewedBy == null ? null : reviewedBy.getId(),
                application.getReviewedAt(),
                application.getCreatedAt());
    }

    private CompanyResponse toCompanyResponse(Company company) {
        User recruiter = company.getRecruiter();
        RecruiterApplication recruiterApplication = company.getRecruiterApplication();

        return new CompanyResponse(
                company.getId(),
                recruiter == null ? null : recruiter.getId(),
                recruiter == null ? null : recruiter.getEmail(),
                recruiterApplication == null ? null : recruiterApplication.getId(),
                company.getLogoUrl(),
                company.getCoverUrl(),
                company.getCompanyFullName(),
                company.getCompanyDisplayName(),
                company.getTaxCode(),
                company.getBillingAddress(),
                company.getCompanySize(),
                company.getCompanyPhone(),
                company.getCompanyWebsite(),
                company.getCompanyIntro(),
                company.getAddresses(),
                company.getGalleryUrls(),
                company.getCreatedAt(),
                company.getUpdatedAt());
    }

    // // Duyet CV
    // Lấy danh sách CV ứng tuyển của 1 Job
    public List<CandidateApplicationResponse> getApplicationsForJob(Long jobId, Long recruiterId) {

        // String jobTitle = "Vị trí ID: " + jobId;

        List<JobApplication> applications = applicationRepository.findByJobId(jobId);

        return applications.stream()
                .map(this::toCandidateApplicationResponse)
                .collect(Collectors.toList());
    }

    private CandidateApplicationResponse toCandidateApplicationResponse(JobApplication app) {
        User applicant = app.getApplicant();
        String applicantName = applicant != null ? applicant.getFirstName() + " " + applicant.getLastName() : "Unknown";
        String applicantEmail = applicant != null ? applicant.getEmail() : "Unknown";
        Job job = app.getJob();

        return new CandidateApplicationResponse(
                app.getId(),
                job.getId(),
                job.getTitle(),
                job.getCompany(),
                job.getLocation(),
                job.getSalary(),
                job.getType(),
                applicant == null ? null : applicant.getId(),
                applicantName,
                applicantEmail,
                app.getAppliedCvUrl(),
                app.getStatus().name(),
                app.getAppliedAt()
        );
    }

    @Transactional
    public void updateApplicationStatus(Long jobId, Long applicationId, String status, Long recruiterId) {
        JobApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hồ sơ ứng tuyển."));

        if (!application.getJob().getId().equals(jobId)) {
            throw new RuntimeException("Hồ sơ không khớp với công việc này.");
        }

        JobApplicationStatus enumStatus;
        try {
            enumStatus = JobApplicationStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Trạng thái không hợp lệ: " + status);
        }

        application.setStatus(enumStatus); 
        applicationRepository.save(application);

        String title = (enumStatus == JobApplicationStatus.ACCEPTED) ? "Hồ sơ đã được duyệt " : "Kết quả ứng tuyển";
        String message = (enumStatus == JobApplicationStatus.ACCEPTED) 
            ? "Tuyệt vời! CV của bạn đã được Nhà tuyển dụng chấp nhận." 
            : "Rất tiếc, CV của bạn chưa phù hợp với vị trí này.";
        
        notificationService.sendNotification(
            application.getApplicant(),
            application,
            title, 
            message, 
            "APPLICATION_" + enumStatus.name()
        );

        User applicant = application.getApplicant();
        if (applicant != null && applicant.getEmail() != null) {
            String emailSubject = "[InternHiring] " + title;
            String emailBody = buildApplicationResultEmail(
                    applicant.getFirstName() + " " + applicant.getLastName(),
                    application.getJob().getTitle(),
                    enumStatus
            );
        emailService.sendEmail(applicant.getEmail(), emailSubject, emailBody);
        }
    }

    private String buildApplicationResultEmail(String name, String jobTitle, JobApplicationStatus status) {
        boolean isAccepted = (status == JobApplicationStatus.ACCEPTED);
        String statusColor = isAccepted ? "#22c55e" : "#ef4444";
        String statusText = isAccepted ? "ĐƯỢC CHẤP NHẬN" : "CHƯA PHÙ HỢP";
        
        return "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;'>" +
                "  <h2 style='color: #0f172a;'>Xin chào " + name + ",</h2>" +
                "  <p style='color: #334155; font-size: 15px; line-height: 1.6;'>" +
                "    Cảm ơn bạn đã quan tâm và nộp đơn ứng tuyển vào nền tảng của chúng tôi. Nhà tuyển dụng đã xem xét hồ sơ của bạn cho vị trí: " +
                "    <strong style='color: #0284c7;'>" + jobTitle + "</strong>." +
                "  </p>" +
                "  <div style='margin: 25px 0; padding: 15px; background-color: #f8fafc; border-left: 5px solid " + statusColor + ";'>" +
                "    <p style='margin: 0; font-size: 14px; color: #475569;'>Trạng thái hồ sơ:</p>" +
                "    <h3 style='margin: 5px 0 0 0; color: " + statusColor + "; font-size: 18px;'>" + statusText + "</h3>" +
                "  </div>" +
                "  <p style='color: #334155; font-size: 15px; line-height: 1.6;'>" +
                "    " + (isAccepted ? "Nhà tuyển dụng sẽ sớm chủ động liên hệ với bạn qua số điện thoại hoặc email này để trao đổi lịch phỏng vấn chi tiết. Bạn hãy chú ý điện thoại nhé!" 
                                    : "Dù chưa có cơ hội đồng hành cùng nhau lần này, thông tin của bạn đã được lưu lại hệ thống. Chúc bạn sẽ sớm tìm được một cơ hội thực tập phù hợp nhất trong tương lai.") +
                "  </p>" +
                "  <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;'>" +
                "  <p style='font-size: 12px; color: #94a3b8; text-align: center;'>Đây là email tự động từ hệ thống hỗ trợ tuyển dụng thực tập InternHiring.</p>" +
                "</div>";
    }
}
