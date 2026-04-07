package com.wiram.backend.dto;

import com.wiram.backend.entity.ReportStatus;
import java.time.OffsetDateTime;

public record ReportStatusHistoryResponse(
    Long id,
    ReportStatus status,
    String notes,
    String changedByName,
    OffsetDateTime changedAt) {}
