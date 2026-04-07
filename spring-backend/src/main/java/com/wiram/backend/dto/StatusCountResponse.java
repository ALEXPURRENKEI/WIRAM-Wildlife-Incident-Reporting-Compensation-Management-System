package com.wiram.backend.dto;

import com.wiram.backend.entity.ReportStatus;

public record StatusCountResponse(ReportStatus status, long count) {}
