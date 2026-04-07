package com.wiram.backend.util;

import com.wiram.backend.entity.User;
import com.wiram.backend.entity.UserRole;
import com.wiram.backend.exception.ForbiddenException;
import java.util.Arrays;

public final class AccessControl {

  private AccessControl() {}

  public static void requireRole(User user, UserRole... allowedRoles) {
    if (user == null) {
      throw new ForbiddenException("Access denied.");
    }

    boolean allowed = Arrays.stream(allowedRoles).anyMatch(role -> role == user.getRole());
    if (!allowed) {
      throw new ForbiddenException("You do not have permission to perform this action.");
    }
  }
}
