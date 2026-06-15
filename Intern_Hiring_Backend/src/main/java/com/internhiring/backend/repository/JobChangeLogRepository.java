package com.internhiring.backend.repository;

import com.internhiring.backend.entity.JobChangeLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobChangeLogRepository extends JpaRepository<JobChangeLog, Long> {
    List<JobChangeLog> findByJobIdAndJobRecruiterIdOrderByCreatedAtDesc(Long jobId, Long recruiterId);
}
