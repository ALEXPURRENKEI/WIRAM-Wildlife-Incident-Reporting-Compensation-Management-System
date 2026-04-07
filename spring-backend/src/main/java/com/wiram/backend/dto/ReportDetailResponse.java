package com.wiram.backend.dto;

import com.wiram.backend.entity.ReportStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ReportDetailResponse(
    UUID id,
    String animalType,
    String incidentType,
    String location,
    String description,
    BigDecimal estimatedLoss,
    String evidenceName,
    String evidenceData,
    ReportStatus status,
    String reporterName,
    String reporterEmail,
    String reviewedByName,
    OffsetDateTime reviewedAt,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    boolean hasEvidence,
    List<ReportStatusHistoryResponse> history) {}
