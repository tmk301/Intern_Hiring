package com.internhiring.backend.repository;

import com.internhiring.backend.entity.RecruiterFormField;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecruiterFormFieldRepository extends JpaRepository<RecruiterFormField, Long> {
    List<RecruiterFormField> findAllByOrderBySortOrderAscLabelAsc();

    List<RecruiterFormField> findByActiveTrueOrderBySortOrderAscLabelAsc();
}
