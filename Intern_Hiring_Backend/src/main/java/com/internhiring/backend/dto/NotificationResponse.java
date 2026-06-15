package com.internhiring.backend.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private String title;
    private String message;
    private boolean isRead;
    private String type;
    private Long jobApplicationId;
    private Long jobId;
    private LocalDateTime createdAt;
}
