package com.internhiring.backend.controller;

import com.internhiring.backend.dto.CategoryOptionRequest;
import com.internhiring.backend.dto.CategoryOptionResponse;
import com.internhiring.backend.entity.AuditAction;
import com.internhiring.backend.entity.AuditTargetType;
import com.internhiring.backend.entity.CategoryKey;
import com.internhiring.backend.service.AuditLogService;
import com.internhiring.backend.service.CategoryOptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryOptionController {

    private final CategoryOptionService service;
    private final AuditLogService auditLogService;

    @GetMapping("/{key}")
    public ResponseEntity<List<CategoryOptionResponse>> getOptions(
            @PathVariable CategoryKey key,
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return ResponseEntity.ok(service.getOptions(key, includeInactive));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CategoryOptionResponse> create(@Valid @RequestBody CategoryOptionRequest request) {
        CategoryOptionResponse response = service.create(request);
        auditLogService.record(
                AuditAction.CATEGORY_CREATED,
                AuditTargetType.CATEGORY_OPTION,
                response.id(),
                "Created category option " + response.label(),
                Map.of("categoryKey", response.categoryKey().name(), "value", response.value(), "label", response.label()));
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CategoryOptionResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody CategoryOptionRequest request) {
        CategoryOptionResponse response = service.update(id, request);
        auditLogService.record(
                AuditAction.CATEGORY_UPDATED,
                AuditTargetType.CATEGORY_OPTION,
                id,
                "Updated category option " + response.label(),
                Map.of("categoryKey", response.categoryKey().name(), "value", response.value(), "label", response.label()));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        auditLogService.record(
                AuditAction.CATEGORY_DELETED,
                AuditTargetType.CATEGORY_OPTION,
                id,
                "Deleted category option " + id,
                Map.of("categoryOptionId", String.valueOf(id)));
        return ResponseEntity.noContent().build();
    }
}
