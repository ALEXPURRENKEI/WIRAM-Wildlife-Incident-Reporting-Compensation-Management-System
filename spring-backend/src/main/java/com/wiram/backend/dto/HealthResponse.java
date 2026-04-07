package com.wiram.backend.dto;

import java.time.OffsetDateTime;

public record HealthResponse(String status, String service, OffsetDateTime timestamp) {}
