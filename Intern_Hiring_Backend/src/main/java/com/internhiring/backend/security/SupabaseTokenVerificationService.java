package com.internhiring.backend.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.internhiring.backend.config.SupabaseConfig;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class SupabaseTokenVerificationService {

    private static final Duration CACHE_TTL = Duration.ofSeconds(45);
    private static final int MAX_CACHE_SIZE = 1_000;

    private final SupabaseConfig supabaseConfig;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = createRestTemplate();
    private final ConcurrentHashMap<String, CachedClaims> claimsCache = new ConcurrentHashMap<>();

    public Claims verifyToken(String token) {
        CachedClaims cached = claimsCache.get(token);
        if (cached != null && !cached.isExpired()) {
            return cached.claims();
        }

        if (cached != null) {
            claimsCache.remove(token, cached);
        }

        try {
            Claims claims = fetchClaimsFromSupabase(token);
            trimCacheIfNeeded();
            claimsCache.put(token, new CachedClaims(claims, Instant.now().plus(CACHE_TTL)));
            return claims;
        } catch (Exception e) {
            log.error("Supabase token verification failed: {}", e.getMessage());
            throw new RuntimeException("Invalid JWT token", e);
        }
    }

    private Claims fetchClaimsFromSupabase(String token) throws Exception {
        String url = "https://" + supabaseConfig.getProjectRef() + ".supabase.co/auth/v1/user";

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);
        headers.set("apikey", supabaseConfig.getAnonKey());

        ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<String>(headers),
                String.class);

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Supabase returned non-2xx status");
        }

        JsonNode userNode = objectMapper.readTree(response.getBody());
        String id = userNode.get("id").asText();
        String email = userNode.has("email") ? userNode.get("email").asText() : null;

        JsonNode userMetadata = userNode.get("user_metadata");
        String firstName = getMetadataValue(userMetadata, "first_name");
        String lastName = getMetadataValue(userMetadata, "last_name");
        String phoneNumber = getMetadataValue(userMetadata, "phone_number");

        return Jwts.claims()
                .subject(id)
                .add("email", email)
                .add("firstName", firstName)
                .add("lastName", lastName)
                .add("phoneNumber", phoneNumber)
                .build();
    }

    private String getMetadataValue(JsonNode userMetadata, String key) {
        return userMetadata != null && userMetadata.has(key) ? userMetadata.get(key).asText() : null;
    }

    private void trimCacheIfNeeded() {
        if (claimsCache.size() < MAX_CACHE_SIZE) {
            return;
        }

        claimsCache.entrySet().removeIf(entry -> entry.getValue().isExpired());
        if (claimsCache.size() >= MAX_CACHE_SIZE) {
            claimsCache.clear();
        }
    }

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(3));
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        return new RestTemplate(requestFactory);
    }

    private record CachedClaims(Claims claims, Instant expiresAt) {
        boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }
}
