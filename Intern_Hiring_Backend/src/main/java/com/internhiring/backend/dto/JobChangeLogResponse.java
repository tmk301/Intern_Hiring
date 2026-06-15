package com.internhiring.backend.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.internhiring.backend.entity.JobChangeLog;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record JobChangeLogResponse(
        Long id,
        Long jobId,
        String actorEmail,
        Map<String, Object> previousData,
        Map<String, Object> newData,
        List<String> changedFields,
        LocalDateTime createdAt
) {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {};

    public static JobChangeLogResponse from(JobChangeLog log) {
        return new JobChangeLogResponse(
                log.getId(),
                log.getJob().getId(),
                log.getActor().getEmail(),
                read(log.getPreviousData(), MAP_TYPE, Map.of()),
                read(log.getNewData(), MAP_TYPE, Map.of()),
                read(log.getChangedFields(), LIST_TYPE, List.of()),
                log.getCreatedAt()
        );
    }

    private static <T> T read(String value, TypeReference<T> type, T fallback) {
        try {
            return OBJECT_MAPPER.readValue(value, type);
        } catch (Exception ignored) {
            return fallback;
        }
    }
}
