package com.internhiring.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "companies")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recruiter_id", nullable = false, unique = true)
    private User recruiter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recruiter_application_id")
    private RecruiterApplication recruiterApplication;

    @Column(name = "logo_url", nullable = false, columnDefinition = "TEXT")
    private String logoUrl;

    @Column(name = "cover_url", nullable = false, columnDefinition = "TEXT")
    private String coverUrl;

    @Column(name = "company_full_name", nullable = false)
    private String companyFullName;

    @Column(name = "company_display_name", nullable = false)
    private String companyDisplayName;

    @Column(name = "tax_code", nullable = false, unique = true, length = 64)
    private String taxCode;

    @Column(name = "billing_address", nullable = false, columnDefinition = "TEXT")
    private String billingAddress;

    @Column(name = "company_size", nullable = false)
    private String companySize;

    @Column(name = "company_phone", nullable = false, length = 64)
    private String companyPhone;

    @Column(name = "company_website", columnDefinition = "TEXT")
    private String companyWebsite;

    @Column(name = "company_intro", columnDefinition = "TEXT")
    private String companyIntro;

    @Column(name = "addresses", nullable = false, columnDefinition = "TEXT")
    private String addresses;

    @Column(name = "gallery_urls", columnDefinition = "TEXT")
    private String galleryUrls;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
