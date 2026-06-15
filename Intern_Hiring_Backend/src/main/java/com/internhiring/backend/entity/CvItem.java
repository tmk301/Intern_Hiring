package com.internhiring.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CvItem {
    private String id;
    private String name;
    private String url;
    private Long uploadedAt;
    private Boolean isDefault;
}