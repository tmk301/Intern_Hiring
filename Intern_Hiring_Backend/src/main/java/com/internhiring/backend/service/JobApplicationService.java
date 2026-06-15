package com.internhiring.backend.service;

import com.internhiring.backend.dto.ApplyJobRequest;
import com.internhiring.backend.entity.JobApplication;
import com.internhiring.backend.entity.User;
import com.internhiring.backend.repository.JobApplicationRepository;
import com.internhiring.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.internhiring.backend.entity.CvItem;
import com.internhiring.backend.entity.Job;
import com.internhiring.backend.repository.JobRepository;
import com.internhiring.backend.entity.JobApplicationStatus;
import com.internhiring.backend.entity.JobStatus;
import com.internhiring.backend.dto.CandidateApplicationResponse;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
 

@Service
@RequiredArgsConstructor
public class JobApplicationService {

    private final JobApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    @Transactional
    public void applyForJob(Long jobId, Long applicantId, ApplyJobRequest request) {

        if (applicationRepository.existsByJobIdAndApplicantId(jobId, applicantId)) {
            throw new RuntimeException("Bạn đã nộp đơn cho công việc này rồi.");
        }

        User user = userRepository.findById(applicantId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin ứng viên."));

        if (user.getCvList() == null || user.getCvList().isEmpty()) {
            throw new RuntimeException("Hồ sơ của bạn chưa có CV nào.");
        }

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy công việc."));

        if (job.getDeletedAt() != null || job.isHidden() || job.getStatus() != JobStatus.APPROVED) {
            throw new RuntimeException("Tin tuyển dụng không còn nhận hồ sơ.");
        }

        if (job.getApplicationDeadline() != null && job.getApplicationDeadline().isBefore(LocalDate.now())) {
            job.setHidden(true);
            jobRepository.save(job);
            throw new RuntimeException("Tin tuyển dụng đã hết hạn nộp hồ sơ.");
        }

        String verifiedCvUrl = user.getCvList().stream()
                .filter(cv -> cv.getId().equals(request.getCvId()))
                .map(CvItem::getUrl)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("CV không hợp lệ hoặc bạn không có quyền truy cập CV này."));

        JobApplication application = new JobApplication();
        application.setJob(job);
        application.setApplicant(user);
        application.setAppliedCvUrl(verifiedCvUrl);
        application.setStatus(JobApplicationStatus.PENDING);

        applicationRepository.save(application);

        // Send confirmation email to candidate
        if (user.getEmail() != null) {
            String candidateSubject = "[InternHiring] Xác nhận nộp hồ sơ thành công";
            String candidateBody = buildSubmissionConfirmationEmail(
                    user.getFirstName() + " " + user.getLastName(),
                    job.getTitle(),
                    job.getCompany()
            );
            emailService.sendEmail(user.getEmail(), candidateSubject, candidateBody);
        }

        Long recruiterId = job.getRecruiter().getId();
        if (recruiterId != null) {
            User recruiter = userRepository.findById(recruiterId).orElse(null);
            if (recruiter != null) {
                notificationService.sendNotification(
                    recruiter,
                    application,
                    "Có ứng viên mới!",
                    "Ứng viên " + user.getFirstName() + " vừa nộp CV vào vị trí: " + job.getTitle(),
                    "NEW_APPLICATION"
                );

                // Send email to recruiter
                if (recruiter.getEmail() != null) {
                    String recruiterSubject = "[InternHiring] Ứng viên mới cho vị trí " + job.getTitle();
                    String recruiterBody = buildNewApplicationEmail(
                            recruiter.getFirstName() + " " + recruiter.getLastName(),
                            user.getFirstName() + " " + user.getLastName(),
                            job.getTitle()
                    );
                    emailService.sendEmail(recruiter.getEmail(), recruiterSubject, recruiterBody);
                }
            }
        }
    }

    private String buildSubmissionConfirmationEmail(String name, String jobTitle, String company) {
        return "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;'>" +
                "  <h2 style='color: #0f172a;'>Xin chào " + name + ",</h2>" +
                "  <p style='color: #334155; font-size: 15px; line-height: 1.6;'>" +
                "    Bạn đã nộp hồ sơ thành công cho vị trí <strong style='color: #0284c7;'>" + jobTitle + "</strong> tại <strong>" + company + "</strong>." +
                "  </p>" +
                "  <p style='color: #334155; font-size: 15px; line-height: 1.6;'>" +
                "    Nhà tuyển dụng sẽ xem xét hồ sơ của bạn và phản hồi trong thời gian sớm nhất. Bạn có thể theo dõi trạng thái ứng tuyển của mình trên hệ thống." +
                "  </p>" +
                "  <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;'>" +
                "  <p style='font-size: 12px; color: #94a3b8; text-align: center;'>Đây là email tự động từ hệ thống hỗ trợ tuyển dụng thực tập InternHiring.</p>" +
                "</div>";
    }

    private String buildNewApplicationEmail(String recruiterName, String candidateName, String jobTitle) {
        return "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;'>" +
                "  <h2 style='color: #0f172a;'>Xin chào " + recruiterName + ",</h2>" +
                "  <p style='color: #334155; font-size: 15px; line-height: 1.6;'>" +
                "    Bạn vừa nhận được hồ sơ ứng tuyển mới từ <strong>" + candidateName + "</strong> cho vị trí <strong style='color: #0284c7;'>" + jobTitle + "</strong>." +
                "  </p>" +
                "  <p style='color: #334155; font-size: 15px; line-height: 1.6;'>" +
                "    Vui lòng đăng nhập vào hệ thống để xem chi tiết CV và tiến hành duyệt hồ sơ." +
                "  </p>" +
                "  <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;'>" +
                "  <p style='font-size: 12px; color: #94a3b8; text-align: center;'>Đây là email tự động từ hệ thống hỗ trợ tuyển dụng thực tập InternHiring.</p>" +
                "</div>";
    }

    public List<CandidateApplicationResponse> getMyApplications(Long applicantId, String status) {
        List<JobApplication> applications;

        if (status == null || status.isBlank()) {
            applications = applicationRepository.findByApplicantIdOrderByAppliedAtDesc(applicantId);
        } else {
            JobApplicationStatus enumStatus;
            try {
                enumStatus = JobApplicationStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Trạng thái không hợp lệ: " + status);
            }
            applications = applicationRepository.findByApplicantIdAndStatusOrderByAppliedAtDesc(applicantId, enumStatus);
        }

        return applications.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private CandidateApplicationResponse toResponse(JobApplication application) {
        User applicant = application.getApplicant();
        Job job = application.getJob();
        String applicantName = applicant.getFirstName() + " " + applicant.getLastName();

        return new CandidateApplicationResponse(
                application.getId(),
                job.getId(),
                job.getTitle(),
                job.getCompany(),
                job.getLocation(),
                job.getSalary(),
                job.getType(),
                applicant.getId(),
                applicantName,
                applicant.getEmail(),
                application.getAppliedCvUrl(),
                application.getStatus().name(),
                application.getAppliedAt()
        );
    }
}
