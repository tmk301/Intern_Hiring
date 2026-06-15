package com.internhiring.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class SiteConfigControllerSecurityTests {

    @LocalServerPort
    private int port;

    @Test
    void getSiteConfigIsPublic() {
        ResponseEntity<String> response = restClient().get()
                .uri("/api/site-config")
                .retrieve()
                .toEntity(String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo("{}");
    }

    @Test
    void putSiteConfigRequiresAdmin() {
        HttpStatus status;
        try {
            restClient().method(HttpMethod.PUT)
                    .uri("/api/admin/site-config")
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .body("{\"heroTitle\":\"Intern Hiring\"}")
                    .retrieve()
                    .toBodilessEntity();
            status = HttpStatus.OK;
        } catch (RestClientResponseException e) {
            status = HttpStatus.valueOf(e.getStatusCode().value());
        }

        assertThat(status).isEqualTo(HttpStatus.FORBIDDEN);
    }

    private RestClient restClient() {
        return RestClient.builder()
                .baseUrl("http://localhost:" + port)
                .build();
    }
}
