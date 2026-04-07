package com.wiram.backend.dto;

import com.wiram.backend.entity.ReportStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateReportStatusRequest(
    @NotNull ReportStatus status,
    @Size(max = 2000) String notes) {}
