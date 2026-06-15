package com.internhiring.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.internhiring.backend.entity.SiteConfig;
import com.internhiring.backend.repository.SiteConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SiteConfigService {

    private static final String MANAGED_SITE_CONFIG_KEY = "managed-site-config";
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final TypeReference<LinkedHashMap<String, Object>> CONFIG_TYPE = new TypeReference<>() {};

    private final SiteConfigRepository repository;

    @Transactional(readOnly = true)
    public Map<String, Object> getManagedSiteConfig() {
        return repository.findById(MANAGED_SITE_CONFIG_KEY)
                .map(this::parseConfig)
                .orElseGet(LinkedHashMap::new);
    }

    @Transactional
    public Map<String, Object> saveManagedSiteConfig(Map<String, Object> config) {
        if (config == null) {
            throw new IllegalArgumentException("Site config must be a JSON object");
        }

        SiteConfig siteConfig = repository.findById(MANAGED_SITE_CONFIG_KEY)
                .orElseGet(() -> new SiteConfig(MANAGED_SITE_CONFIG_KEY, "{}", null, null));
        siteConfig.setConfigJson(toJson(config));
        return parseConfig(repository.save(siteConfig));
    }

    @Transactional
    public Map<String, Object> saveManagedSiteConfig(String configJson) {
        Map<String, Object> config = parseRequestConfig(configJson);
        SiteConfig siteConfig = repository.findById(MANAGED_SITE_CONFIG_KEY)
                .orElseGet(() -> new SiteConfig(MANAGED_SITE_CONFIG_KEY, "{}", null, null));
        siteConfig.setConfigJson(toJson(config));
        return parseConfig(repository.save(siteConfig));
    }

    private Map<String, Object> parseConfig(SiteConfig siteConfig) {
        try {
            return objectMapper.readValue(siteConfig.getConfigJson(), CONFIG_TYPE);
        } catch (Exception e) {
            throw new IllegalArgumentException("Stored site config is invalid", e);
        }
    }

    private String toJson(Map<String, Object> config) {
        try {
            return objectMapper.writeValueAsString(config);
        } catch (Exception e) {
            throw new IllegalArgumentException("Site config is invalid", e);
        }
    }

    private Map<String, Object> parseRequestConfig(String configJson) {
        try {
            if (configJson == null || configJson.isBlank()) {
                throw new IllegalArgumentException("Site config must be a JSON object");
            }

            JsonNode node = objectMapper.readTree(configJson);
            if (node == null || !node.isObject()) {
                throw new IllegalArgumentException("Site config must be a JSON object");
            }

            return objectMapper.readValue(configJson, CONFIG_TYPE);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Site config must be valid JSON", e);
        }
    }
}
