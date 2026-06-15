package com.internhiring.backend.repository;

import com.internhiring.backend.entity.CategoryKey;
import com.internhiring.backend.entity.CategoryOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryOptionRepository extends JpaRepository<CategoryOption, Long> {
    List<CategoryOption> findByCategoryKeyOrderBySortOrderAscLabelAsc(CategoryKey categoryKey);

    List<CategoryOption> findByCategoryKeyAndActiveTrueOrderBySortOrderAscLabelAsc(CategoryKey categoryKey);
}
