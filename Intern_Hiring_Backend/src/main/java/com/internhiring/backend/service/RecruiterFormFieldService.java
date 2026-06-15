package com.internhiring.backend.service;

import com.internhiring.backend.dto.RecruiterFormFieldRequest;
import com.internhiring.backend.dto.RecruiterFormFieldResponse;
import com.internhiring.backend.entity.RecruiterFormField;
import com.internhiring.backend.repository.RecruiterFormFieldRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

@Service
@RequiredArgsConstructor
public class RecruiterFormFieldService {

    private final RecruiterFormFieldRepository repository;

    public List<RecruiterFormFieldResponse> getFields(boolean includeInactive) {
        List<RecruiterFormField> fields = includeInactive
                ? repository.findAllByOrderBySortOrderAscLabelAsc()
                : repository.findByActiveTrueOrderBySortOrderAscLabelAsc();
        return fields.stream().map(this::toResponse).toList();
    }

    public List<RecruiterFormField> getActiveEntities() {
        return repository.findByActiveTrueOrderBySortOrderAscLabelAsc();
    }

    public RecruiterFormFieldResponse create(RecruiterFormFieldRequest request) {
        RecruiterFormField field = new RecruiterFormField();
        apply(field, request);
        return toResponse(repository.save(field));
    }

    public RecruiterFormFieldResponse update(Long id, RecruiterFormFieldRequest request) {
        RecruiterFormField field = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recruiter form field not found: " + id));
        apply(field, request);
        return toResponse(repository.save(field));
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Recruiter form field not found: " + id);
        }
        repository.deleteById(id);
    }

    private void apply(RecruiterFormField field, RecruiterFormFieldRequest request) {
        String validationRegex = normalizeRegex(request.validationRegex());
        field.setName(request.name().trim());
        field.setLabel(request.label().trim());
        field.setValidationRegex(validationRegex);
        field.setPlaceholder(request.placeholder());
        field.setRequired(request.required());
        field.setSortOrder(request.sortOrder());
        field.setActive(request.active());
    }

    private String normalizeRegex(String validationRegex) {
        if (validationRegex == null || validationRegex.isBlank()) {
            return null;
        }

        String trimmed = validationRegex.trim();
        try {
            Pattern.compile(trimmed);
        } catch (PatternSyntaxException error) {
            throw new IllegalArgumentException("Invalid validation regex: " + error.getDescription());
        }

        return trimmed;
    }

    public RecruiterFormFieldResponse toResponse(RecruiterFormField field) {
        return new RecruiterFormFieldResponse(
                field.getId(),
                field.getName(),
                field.getLabel(),
                field.getValidationRegex(),
                field.getPlaceholder(),
                field.isRequired(),
                field.getSortOrder(),
                field.isActive());
    }
}
