package com.wiram.backend.dto;

import com.wiram.backend.entity.UserRole;
import com.wiram.backend.entity.PaymentMode;
import java.time.OffsetDateTime;
import java.util.UUID;

public record UserResponse(
    UUID id,
    String name,
    String email,
    UserRole role,
    PaymentMode paymentMode,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
