package com.wiram.backend.service;

import com.wiram.backend.dto.AuthResponse;
import com.wiram.backend.dto.LoginRequest;
import com.wiram.backend.dto.RegisterRequest;
import com.wiram.backend.dto.UserResponse;
import com.wiram.backend.entity.AuthSession;
import com.wiram.backend.entity.User;
import com.wiram.backend.entity.UserRole;
import com.wiram.backend.exception.ConflictException;
import com.wiram.backend.exception.ForbiddenException;
import com.wiram.backend.exception.NotFoundException;
import com.wiram.backend.exception.UnauthorizedException;
import com.wiram.backend.repository.AuthSessionRepository;
import com.wiram.backend.repository.UserRepository;
import com.wiram.backend.util.ApiMapper;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  private static final Duration SESSION_TTL = Duration.ofDays(7);

  private final UserRepository userRepository;
  private final AuthSessionRepository authSessionRepository;
  private final PasswordEncoder passwordEncoder;
  private final SecureRandom secureRandom = new SecureRandom();

  public AuthService(
      UserRepository userRepository,
      AuthSessionRepository authSessionRepository,
      PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.authSessionRepository = authSessionRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @Transactional
  public AuthResponse register(RegisterRequest request) {
    cleanupExpiredSessions();

    if (userRepository.existsByEmailIgnoreCase(request.email())) {
      throw new ConflictException("An account with this email already exists.");
    }

    User user = new User();
    user.setName(request.name().trim());
    user.setEmail(request.email().trim().toLowerCase());
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    user.setRole(UserRole.MEMBER);
    userRepository.save(user);

    AuthSession session = createSession(user);
    authSessionRepository.save(session);

    return toAuthResponse(user, session);
  }

  @Transactional
  public AuthResponse login(LoginRequest request) {
    cleanupExpiredSessions();

    User user =
        userRepository
            .findByEmailIgnoreCase(request.email().trim())
            .orElseThrow(() -> new UnauthorizedException("Invalid email or password."));

    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    AuthSession session = createSession(user);
    authSessionRepository.save(session);
    return toAuthResponse(user, session);
  }

  @Transactional
  public void logout(HttpServletRequest request) {
    String token = extractToken(request);
    if (token == null || token.isBlank()) {
      throw new UnauthorizedException("Missing authentication token.");
    }

    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    cleanupExpiredSessions(now);
    AuthSession session =
        authSessionRepository
            .findByTokenAndExpiresAtAfter(token, now)
            .orElseThrow(() -> new UnauthorizedException("Session expired or invalid."));
    authSessionRepository.delete(session);
  }

  @Transactional
  public User requireUser(HttpServletRequest request) {
    String token = extractToken(request);
    if (token == null || token.isBlank()) {
      throw new UnauthorizedException("Missing authentication token.");
    }

    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    cleanupExpiredSessions(now);
    AuthSession session =
        authSessionRepository
            .findByTokenAndExpiresAtAfter(token, now)
            .orElseThrow(() -> new UnauthorizedException("Session expired or invalid."));

    session.setLastUsedAt(now);
    authSessionRepository.save(session);

    UUID userId = session.getUser().getId();
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new NotFoundException("Authenticated user was not found."));
  }

  @Transactional(readOnly = true)
  public UserResponse toUserResponse(User user) {
    return ApiMapper.toUserResponse(user);
  }

  public void requireRole(User user, UserRole... allowedRoles) {
    boolean allowed = false;
    for (UserRole allowedRole : allowedRoles) {
      if (user.getRole() == allowedRole) {
        allowed = true;
        break;
      }
    }

    if (!allowed) {
      throw new ForbiddenException("You do not have permission to perform this action.");
    }
  }

  private AuthSession createSession(User user) {
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    AuthSession session = new AuthSession();
    session.setUser(user);
    session.setToken(generateToken());
    session.setExpiresAt(now.plus(SESSION_TTL));
    session.setLastUsedAt(now);
    return session;
  }

  private AuthResponse toAuthResponse(User user, AuthSession session) {
    return new AuthResponse(session.getToken(), session.getExpiresAt(), ApiMapper.toUserResponse(user));
  }

  private String generateToken() {
    byte[] bytes = new byte[32];
    secureRandom.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private String extractToken(HttpServletRequest request) {
    if (request == null) {
      return null;
    }

    String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (authorization != null && !authorization.isBlank()) {
      String trimmed = authorization.trim();
      if (trimmed.regionMatches(true, 0, "Bearer ", 0, 7)) {
        return trimmed.substring(7).trim();
      }
      return trimmed;
    }

    String headerToken = request.getHeader("X-Auth-Token");
    return headerToken == null ? null : headerToken.trim();
  }

  private void cleanupExpiredSessions() {
    cleanupExpiredSessions(OffsetDateTime.now(ZoneOffset.UTC));
  }

  private void cleanupExpiredSessions(OffsetDateTime now) {
    authSessionRepository.deleteExpired(now);
  }
}
