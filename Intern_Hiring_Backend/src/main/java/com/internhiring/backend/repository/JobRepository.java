package com.internhiring.backend.repository;

import com.internhiring.backend.entity.Job;
import com.internhiring.backend.entity.JobStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface JobRepository extends JpaRepository<Job, Long> {
    List<Job> findAllByOrderByCreatedAtDesc();

    Page<Job> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<Job> findByStatusAndHiddenFalseAndDeletedAtIsNullOrderByCreatedAtDesc(JobStatus status);

    List<Job> findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(JobStatus status);

    Page<Job> findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(JobStatus status, Pageable pageable);

    Optional<Job> findByIdAndDeletedAtIsNull(Long id);

    List<Job> findByRecruiterIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long recruiterId);

    Page<Job> findByRecruiterIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long recruiterId, Pageable pageable);

    Optional<Job> findByIdAndRecruiterIdAndDeletedAtIsNull(Long id, Long recruiterId);

    List<Job> findByDeletedAtIsNullOrderByCreatedAtDesc();

    Page<Job> findByDeletedAtIsNullOrderByCreatedAtDesc(Pageable pageable);

    List<Job> findByDeletedAtIsNullAndHiddenFalseAndStatusOrderByCreatedAtDesc(JobStatus status);

    List<Job> findByDeletedAtIsNullAndHiddenFalseAndApplicationDeadlineBefore(LocalDate date);
    
    long countByRecruiterIdAndStatus(Long recruiterId, JobStatus status);
}
