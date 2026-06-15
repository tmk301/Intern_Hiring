package com.internhiring.backend.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.internhiring.backend.entity.Role;
import com.internhiring.backend.entity.User;
import com.internhiring.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    @Value("${admin.email:admin@intern-hiring.com}")
    private String adminEmail;

    @Value("${admin.password:123456789}")
    private String adminPassword;

    private final UserRepository userRepository;
    private final SupabaseConfig supabaseConfig;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public void run(String... args) {
        var existingAdmin = userRepository.findByEmail(adminEmail);

        if (existingAdmin.isPresent()) {
            User admin = existingAdmin.get();
            if (admin.getSupabaseId() != null) {
                log.info(">>> Admin account already exists: {}", adminEmail);
                return;
            }
            // Admin exists locally but has no supabaseId → create on Supabase and link
            log.info(">>> Admin exists locally without supabaseId, creating on Supabase...");
            try {
                UUID supabaseId = createSupabaseAdminUser();
                admin.setSupabaseId(supabaseId);
                userRepository.save(admin);
                log.info(">>> Linked admin to Supabase: {}", adminEmail);
            } catch (Exception e) {
                log.warn(">>> Failed to link admin to Supabase: {}", e.getMessage());
            }
            return;
        }

        try {
            UUID supabaseId = createSupabaseAdminUser();
            createLocalAdminUser(supabaseId);
            log.info(">>> Admin account created successfully: {}", adminEmail);
        } catch (Exception e) {
            log.warn(">>> Failed to create admin account: {}. App will continue without seeded admin.", e.getMessage());
        }
    }

    private UUID createSupabaseAdminUser() {
        String url = supabaseConfig.getProjectUrl() + "/auth/v1/admin/users";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + supabaseConfig.getServiceRoleKey());
        headers.set("apikey", supabaseConfig.getAnonKey());

        Map<String, Object> body = Map.of(
                "email", adminEmail,
                "password", adminPassword,
                "email_confirm", true,
                "user_metadata", Map.of(
                        "first_name", "System",
                        "last_name", "Admin"
                )
        );

        try {
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, request, String.class);

            JsonNode node = objectMapper.readTree(response.getBody());
            return UUID.fromString(node.get("id").asText());
        } catch (HttpClientErrorException e) {
            // 422 = user already exists on Supabase but not in local DB
            if (e.getStatusCode().value() == 422) {
                log.info(">>> Admin already exists on Supabase, fetching supabase_id...");
                return fetchSupabaseUserId();
            }
            throw new RuntimeException("Supabase Admin API error: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create admin on Supabase: " + e.getMessage(), e);
        }
    }

    private UUID fetchSupabaseUserId() {
        // Use admin GET endpoint to find user by email
        String url = supabaseConfig.getProjectUrl() + "/auth/v1/admin/users";

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + supabaseConfig.getServiceRoleKey());
        headers.set("apikey", supabaseConfig.getAnonKey());

        try {
            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, request, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode users = root.has("users") ? root.get("users") : root;

            if (users.isArray()) {
                for (JsonNode userNode : users) {
                    if (adminEmail.equals(userNode.get("email").asText())) {
                        return UUID.fromString(userNode.get("id").asText());
                    }
                }
            }
            throw new RuntimeException("Admin user not found on Supabase after 422");
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch admin from Supabase: " + e.getMessage(), e);
        }
    }

    private void createLocalAdminUser(UUID supabaseId) {
        User admin = new User();
        admin.setEmail(adminEmail);
        admin.setSupabaseId(supabaseId);
        admin.setFirstName("System");
        admin.setLastName("Admin");
        admin.setPhoneNumber("0123456789");
        admin.setRole(Role.ADMIN);
        userRepository.save(admin);
    }
}
