package com.internhiring.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.internhiring.backend.entity.User;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final SiteConfigService siteConfigService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${email.notifications.enabled:false}")
    private boolean emailNotificationsEnabled;

    @Value("${email.notifications.edge-url:}")
    private String edgeEmailUrl;

    @Value("${email.notifications.edge-secret:}")
    private String edgeEmailSecret;

    @Value("${email.notifications.from:no-reply@intern-hiring.local}")
    private String fromAddress;

    @Value("${spring.mail.host:}")
    private String smtpHost;

    @Value("${email.resend.api-key:}")
    private String resendApiKey;

    @Value("${email.resend.from:${email.notifications.from:InternHiring <onboarding@resend.dev>}}")
    private String resendFromAddress;

    @Async
    public void sendNotificationEmail(User user, String title, String message) {
        if (!emailNotificationsEnabled) {
            log.debug("Email notifications are disabled");
            return;
        }

        if (user == null || !StringUtils.hasText(user.getEmail())) {
            return;
        }

        if (!StringUtils.hasText(title) || !StringUtils.hasText(message)) {
            log.debug("Skip notification email because title or message is empty");
            return;
        }

        if (StringUtils.hasText(resendApiKey)) {
            String contentHtml = "<p style=\"margin:0;\">" + escapeHtml(message).replace("\n", "<br />") + "</p>";
            sendResendEmail(user.getEmail(), "[InternHiring] " + title, title, contentHtml);
            return;
        }

        if (!StringUtils.hasText(edgeEmailUrl) || !StringUtils.hasText(edgeEmailSecret)) {
            log.warn("Email notifications are enabled but neither RESEND_API_KEY nor Supabase Edge Function is configured");
            return;
        }

        try {
            String body = objectMapper.writeValueAsString(Map.of(
                    "to", user.getEmail(),
                    "subject", "[InternHiring] " + title,
                    "title", title,
                    "message", message,
                    "template", getEmailTemplate()
            ));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(edgeEmailUrl))
                    .header("Content-Type", "application/json")
                    .header("x-edge-secret", edgeEmailSecret)
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Failed to send notification email to {}. Edge Function returned {}: {}",
                        user.getEmail(), response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("Failed to call notification email Edge Function for {}: {}", user.getEmail(), e.getMessage());
        }
    }

    @Async
    public void sendEmail(String to, String subject, String htmlContent) {
        if (!emailNotificationsEnabled) {
            log.debug("Email notifications are disabled");
            return;
        }

        if (StringUtils.hasText(resendApiKey)) {
            sendResendEmail(to, subject, subject.replace("[InternHiring]", "").trim(), htmlContent);
            return;
        }

        if (!StringUtils.hasText(smtpHost)) {
            log.debug("SMTP is not configured");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(renderEmailTemplate(subject.replace("[InternHiring]", "").trim(), htmlContent), true);
            helper.setFrom(fromAddress);

            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    private void sendResendEmail(String to, String subject, String title, String contentHtml) {
        if (!StringUtils.hasText(to) || !StringUtils.hasText(subject)) {
            return;
        }

        if (!StringUtils.hasText(resendApiKey)) {
            log.warn("Resend API key is not configured");
            return;
        }

        try {
            String html = renderEmailTemplate(StringUtils.hasText(title) ? title : subject, contentHtml);
            String body = objectMapper.writeValueAsString(Map.of(
                    "from", resendFromAddress,
                    "to", to,
                    "subject", subject,
                    "html", html
            ));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Failed to send Resend email to {}. Resend returned {}: {}",
                        to, response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("Failed to send Resend email to {}: {}", to, e.getMessage());
        }
    }

    public String renderEmailTemplate(String title, String contentHtml) {
        Map<String, Object> template = getEmailTemplate();
        String brandName = stringValue(template, "brandName", "InternHiring");
        String headerImageUrl = safeImageUrl(stringValue(template, "headerImageUrl", ""));
        String backgroundColor = safeColor(stringValue(template, "backgroundColor", "#f8fafc"), "#f8fafc");
        String cardColor = safeColor(stringValue(template, "cardColor", "#ffffff"), "#ffffff");
        String textColor = safeColor(stringValue(template, "textColor", "#334155"), "#334155");
        String accentColor = safeColor(stringValue(template, "accentColor", "#2563eb"), "#2563eb");
        int fontSize = intValue(template, "fontSize", 15, 12, 20);
        String footerText = stringValue(template, "footerText", "Email nay duoc gui tu he thong thong bao InternHiring.");

        String imageHtml = StringUtils.hasText(headerImageUrl)
                ? "<img src=\"" + escapeHtml(headerImageUrl) + "\" alt=\"\" style=\"display:block;width:100%;max-width:100%;height:auto;max-height:260px;object-fit:contain;border-radius:10px;margin-bottom:20px;\" />"
                : "";

        return "<div style=\"margin:0;padding:24px;background:" + backgroundColor + ";font-family:Arial,sans-serif;\">"
                + "<div style=\"max-width:620px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:" + cardColor + ";\">"
                + imageHtml
                + "<div style=\"font-size:13px;font-weight:700;color:" + accentColor + ";margin-bottom:16px;\">"
                + escapeHtml(brandName)
                + "</div>"
                + "<h1 style=\"font-size:22px;line-height:1.35;color:#0f172a;margin:0 0 12px;\">"
                + escapeHtml(title)
                + "</h1>"
                + "<div style=\"font-size:" + fontSize + "px;line-height:1.7;color:" + textColor + ";\">"
                + contentHtml
                + "</div>"
                + "<div style=\"height:1px;background:#e2e8f0;margin:24px 0;\"></div>"
                + "<p style=\"font-size:12px;color:#64748b;margin:0;text-align:center;\">"
                + escapeHtml(footerText)
                + "</p>"
                + "</div>"
                + "</div>";
    }

    private Map<String, Object> getEmailTemplate() {
        Object rawTemplate = siteConfigService.getManagedSiteConfig().get("emailTemplate");
        if (rawTemplate instanceof Map<?, ?> source) {
            Map<String, Object> template = new LinkedHashMap<>();
            source.forEach((key, value) -> {
                if (key instanceof String stringKey) {
                    template.put(stringKey, value);
                }
            });
            return template;
        }
        return Map.of();
    }

    private String stringValue(Map<String, Object> source, String key, String fallback) {
        Object value = source.get(key);
        return value instanceof String stringValue && StringUtils.hasText(stringValue) ? stringValue.trim() : fallback;
    }

    private int intValue(Map<String, Object> source, String key, int fallback, int min, int max) {
        Object value = source.get(key);
        int number = fallback;
        if (value instanceof Number numericValue) {
            number = numericValue.intValue();
        }
        return Math.max(min, Math.min(max, number));
    }

    private String safeColor(String value, String fallback) {
        return value.matches("^#[0-9a-fA-F]{6}$") ? value : fallback;
    }

    private String safeImageUrl(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/") ? value : "";
    }

    private String escapeHtml(String value) {
        return value == null ? "" : value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#039;");
    }
}
