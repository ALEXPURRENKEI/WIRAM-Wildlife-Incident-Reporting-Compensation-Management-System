package com.wiram.backend.dto;

import com.wiram.backend.entity.UserRole;
import jakarta.validation.constraints.NotNull;

public record UpdateUserRoleRequest(@NotNull UserRole role) {}
