package com.internhiring.backend.controller;

import com.internhiring.backend.service.SiteConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class SiteConfigController {

    private final SiteConfigService siteConfigService;

    @GetMapping("/api/site-config")
    public ResponseEntity<Map<String, Object>> getSiteConfig() {
        return ResponseEntity.ok(siteConfigService.getManagedSiteConfig());
    }

    @PutMapping("/api/admin/site-config")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> saveSiteConfig(@RequestBody String configJson) {
        return ResponseEntity.ok(siteConfigService.saveManagedSiteConfig(configJson));
    }
}
