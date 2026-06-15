package com.internhiring.backend.dto;

import java.time.LocalDateTime;

public record CompanyResponse(
        Long id,
        Long recruiterId,
        String recruiterEmail,
        Long recruiterApplicationId,
        String logoUrl,
        String coverUrl,
        String companyFullName,
        String companyDisplayName,
        String taxCode,
        String billingAddress,
        String companySize,
        String companyPhone,
        String companyWebsite,
        String companyIntro,
        String addresses,
        String galleryUrls,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
