package com.internhiring.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "supabase")
public class SupabaseConfig {
    private String projectRef;
    private String anonKey;
    private String serviceRoleKey;
    private String jwksUri;
    
    public String getProjectUrl() {
        return "https://" + projectRef + ".supabase.co";
    }
}
