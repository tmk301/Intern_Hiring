package com.internhiring.backend.repository;

import com.internhiring.backend.entity.JobApplication;
import com.internhiring.backend.entity.JobApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    boolean existsByJobIdAndApplicantId(Long jobId, Long applicantId);

    List<JobApplication> findByJobId(Long jobId);

    Page<JobApplication> findByJobId(Long jobId, Pageable pageable);

    List<JobApplication> findByApplicantIdOrderByAppliedAtDesc(Long applicantId);

    Page<JobApplication> findByApplicantIdOrderByAppliedAtDesc(Long applicantId, Pageable pageable);

    List<JobApplication> findByApplicantIdAndStatusOrderByAppliedAtDesc(Long applicantId, JobApplicationStatus status);

    Page<JobApplication> findByApplicantIdAndStatusOrderByAppliedAtDesc(Long applicantId, JobApplicationStatus status, Pageable pageable);

}