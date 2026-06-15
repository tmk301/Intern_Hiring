package com.internhiring.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.LinkedHashMap;
import java.util.Map;

@SpringBootTest
@ActiveProfiles("test")
class SiteConfigServiceTests {

    @Autowired
    private SiteConfigService siteConfigService;

    @Test
    void savesAndLoadsManagedSiteConfig() {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("heroTitle", "Intern Hiring");
        config.put("primaryColor", "#2563eb");
        config.put("loginHero", Map.of("enabled", true, "imageUrl", "https://example.com/hero.png"));

        Map<String, Object> saved = siteConfigService.saveManagedSiteConfig(config);
        Map<String, Object> loaded = siteConfigService.getManagedSiteConfig();

        assertThat(saved).containsEntry("heroTitle", "Intern Hiring");
        assertThat(loaded).containsEntry("primaryColor", "#2563eb");
        assertThat(loaded.get("loginHero")).isInstanceOf(Map.class);
    }
}
