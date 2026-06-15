package com.internhiring.backend.dto;

import com.internhiring.backend.entity.AuditAction;
import com.internhiring.backend.entity.AuditTargetType;

import java.time.LocalDateTime;
import java.util.Map;

public record AuditLogResponse(
        Long id,
        Long actorId,
        String actorEmail,
        String actorRole,
        AuditAction action,
        AuditTargetType targetType,
        Long targetId,
        String description,
        Map<String, String> metadata,
        LocalDateTime createdAt) {
}
