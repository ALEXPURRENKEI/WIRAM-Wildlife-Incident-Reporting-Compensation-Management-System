package com.wiram.backend.dto;

import com.wiram.backend.entity.ReportStatus;
import com.wiram.backend.entity.PaymentMode;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ReportListResponse(
    UUID id,
    String animalType,
    String incidentType,
    String location,
    BigDecimal estimatedLoss,
    ReportStatus status,
    PaymentMode paymentMode,
    String reporterName,
    String reporterEmail,
    String reviewedByName,
    OffsetDateTime reviewedAt,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    boolean hasEvidence) {}
