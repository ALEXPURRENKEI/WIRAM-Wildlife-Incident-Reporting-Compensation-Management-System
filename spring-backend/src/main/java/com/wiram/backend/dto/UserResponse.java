package com.wiram.backend.dto;

import com.wiram.backend.entity.UserRole;
import java.time.OffsetDateTime;
import java.util.UUID;

public record UserResponse(
    UUID id,
    String name,
    String email,
    UserRole role,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
