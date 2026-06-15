package com.internhiring.backend.service;

import com.internhiring.backend.dto.AuditLogResponse;
import com.internhiring.backend.entity.AuditAction;
import com.internhiring.backend.entity.AuditLog;
import com.internhiring.backend.entity.AuditTargetType;
import com.internhiring.backend.entity.User;
import com.internhiring.backend.repository.AuditLogRepository;
import com.internhiring.backend.security.AuthenticatedUser;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(
            AuditAction action,
            AuditTargetType targetType,
            Long targetId,
            String description,
            Map<String, String> metadata) {
        try {
            AuditLog auditLog = new AuditLog();
            applyActor(auditLog);
            auditLog.setAction(action);
            auditLog.setTargetType(targetType);
            auditLog.setTargetId(targetId);
            auditLog.setDescription(description);
            auditLog.setMetadata(sanitize(metadata));
            auditLogRepository.save(auditLog);
        } catch (Exception error) {
            log.warn("Failed to write audit log for {} {}", action, targetId, error);
        }
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> list(
            AuditAction action,
            AuditTargetType targetType,
            String actorEmail,
            LocalDateTime from,
            LocalDateTime to,
            Pageable pageable) {
        return auditLogRepository.findAll(buildSpec(action, targetType, actorEmail, from, to), pageable)
                .map(this::toResponse);
    }

    private void applyActor(AuditLog auditLog) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication == null ? null : authentication.getPrincipal();

        if (principal instanceof AuthenticatedUser authenticatedUser) {
            auditLog.setActorId(authenticatedUser.getId());
            auditLog.setActorEmail(authenticatedUser.getUsername());
            auditLog.setActorRole(authenticatedUser.getRole().name());
            return;
        }

        auditLog.setActorEmail(authentication == null ? "system" : authentication.getName());
        auditLog.setActorRole("UNKNOWN");
    }

    private Map<String, String> sanitize(Map<String, String> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return Map.of();
        }

        Map<String, String> result = new LinkedHashMap<>();
        metadata.forEach((key, value) -> {
            if (key != null && value != null && !isSensitiveKey(key)) {
                result.put(key, value.length() > 500 ? value.substring(0, 500) : value);
            }
        });
        return result;
    }

    private boolean isSensitiveKey(String key) {
        String normalized = key.toLowerCase();
        return normalized.contains("password")
                || normalized.contains("token")
                || normalized.contains("secret")
                || normalized.contains("authorization");
    }

    private Specification<AuditLog> buildSpec(
            AuditAction action,
            AuditTargetType targetType,
            String actorEmail,
            LocalDateTime from,
            LocalDateTime to) {
        return (root, query, builder) -> {
            ArrayList<Predicate> predicates = new ArrayList<>();

            if (action != null) {
                predicates.add(builder.equal(root.get("action"), action));
            }
            if (targetType != null) {
                predicates.add(builder.equal(root.get("targetType"), targetType));
            }
            if (actorEmail != null && !actorEmail.isBlank()) {
                predicates.add(builder.like(builder.lower(root.get("actorEmail")), "%" + actorEmail.toLowerCase() + "%"));
            }
            if (from != null) {
                predicates.add(builder.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                predicates.add(builder.lessThanOrEqualTo(root.get("createdAt"), to));
            }

            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private AuditLogResponse toResponse(AuditLog auditLog) {
        return new AuditLogResponse(
                auditLog.getId(),
                auditLog.getActorId(),
                auditLog.getActorEmail(),
                auditLog.getActorRole(),
                auditLog.getAction(),
                auditLog.getTargetType(),
                auditLog.getTargetId(),
                auditLog.getDescription(),
                auditLog.getMetadata(),
                auditLog.getCreatedAt());
    }
}
