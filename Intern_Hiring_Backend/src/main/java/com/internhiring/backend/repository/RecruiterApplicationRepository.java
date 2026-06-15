package com.internhiring.backend.repository;

import com.internhiring.backend.entity.RecruiterApplication;
import com.internhiring.backend.entity.RecruiterApplicationStatus;
import com.internhiring.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecruiterApplicationRepository extends JpaRepository<RecruiterApplication, Long> {
    List<RecruiterApplication> findAllByOrderByCreatedAtDesc();

    List<RecruiterApplication> findByStatusOrderByCreatedAtDesc(RecruiterApplicationStatus status);

    Optional<RecruiterApplication> findFirstByApplicantAndStatusOrderByCreatedAtDesc(
            User applicant,
            RecruiterApplicationStatus status);
}
