package com.internhiring.backend.service;

import com.internhiring.backend.dto.NotificationResponse;
import com.internhiring.backend.entity.Job;
import com.internhiring.backend.entity.JobApplication;
import com.internhiring.backend.entity.Notification;
import com.internhiring.backend.entity.User;
import com.internhiring.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final EmailService emailService;

    @Transactional
    public void sendNotification(User user, JobApplication jobApplication, String title, String message, String type) {
        Job job = jobApplication != null ? jobApplication.getJob() : null;
        createNotification(user, jobApplication, job, title, message, type);
    }

    @Transactional
    public void sendJobNotification(User user, Job job, String title, String message, String type) {
        createNotification(user, null, job, title, message, type);
    }

    private void createNotification(User user, JobApplication jobApplication, Job job, String title, String message, String type) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setJobApplication(jobApplication);
        notification.setJob(job);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notificationRepository.save(notification);

        if (shouldSendEmail(user, type)) {
            emailService.sendNotificationEmail(user, title, message);
        }
    }

    private boolean shouldSendEmail(User user, String type) {
        return user != null && user.isEmailNotificationsEnabled();
    }

    public List<NotificationResponse> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
        .map(this::toResponse).collect(Collectors.toList());
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long userId, Long notificationId) {
        notificationRepository.findByIdAndUserId(notificationId, userId).ifPresent(notification -> {
            notification.setRead(true);
            notificationRepository.save(notification);
        });
    }

    private NotificationResponse toResponse(Notification notif) {
        Long appId = notif.getJobApplication() != null ? notif.getJobApplication().getId() : null;
        Long jobId = notif.getJob() != null
                ? notif.getJob().getId()
                : notif.getJobApplication() != null ? notif.getJobApplication().getJob().getId() : null;
        
        return new NotificationResponse(
                notif.getId(), notif.getTitle(), notif.getMessage(),
                notif.isRead(), notif.getType(), appId, jobId, notif.getCreatedAt()
        );
    }
}
