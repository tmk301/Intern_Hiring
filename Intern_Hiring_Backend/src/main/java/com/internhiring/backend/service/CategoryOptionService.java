package com.internhiring.backend.service;

import com.internhiring.backend.dto.CategoryOptionRequest;
import com.internhiring.backend.dto.CategoryOptionResponse;
import com.internhiring.backend.entity.CategoryKey;
import com.internhiring.backend.entity.CategoryOption;
import com.internhiring.backend.repository.CategoryOptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryOptionService {

    private final CategoryOptionRepository repository;

    public List<CategoryOptionResponse> getOptions(CategoryKey key, boolean includeInactive) {
        List<CategoryOption> options = includeInactive
                ? repository.findByCategoryKeyOrderBySortOrderAscLabelAsc(key)
                : repository.findByCategoryKeyAndActiveTrueOrderBySortOrderAscLabelAsc(key);
        return options.stream().map(this::toResponse).toList();
    }

    public CategoryOptionResponse create(CategoryOptionRequest request) {
        CategoryOption option = new CategoryOption();
        apply(option, request);
        return toResponse(repository.save(option));
    }

    public CategoryOptionResponse update(Long id, CategoryOptionRequest request) {
        CategoryOption option = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Category option not found: " + id));
        apply(option, request);
        return toResponse(repository.save(option));
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Category option not found: " + id);
        }
        repository.deleteById(id);
    }

    private void apply(CategoryOption option, CategoryOptionRequest request) {
        option.setCategoryKey(request.categoryKey());
        option.setValue(request.value().trim());
        option.setLabel(request.label().trim());
        option.setSortOrder(request.sortOrder());
        option.setActive(request.active());
    }

    public CategoryOptionResponse toResponse(CategoryOption option) {
        return new CategoryOptionResponse(
                option.getId(),
                option.getCategoryKey(),
                option.getValue(),
                option.getLabel(),
                option.getSortOrder(),
                option.isActive());
    }
}
