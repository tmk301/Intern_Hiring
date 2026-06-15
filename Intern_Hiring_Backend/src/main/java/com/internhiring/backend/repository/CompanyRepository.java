package com.internhiring.backend.repository;

import com.internhiring.backend.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanyRepository extends JpaRepository<Company, Long> {
    Optional<Company> findByRecruiterId(Long recruiterId);

    boolean existsByTaxCodeIgnoreCaseAndRecruiterIdNot(String taxCode, Long recruiterId);
}
