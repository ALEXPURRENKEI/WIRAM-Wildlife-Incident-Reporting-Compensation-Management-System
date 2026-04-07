package com.wiram.backend.repository;

import com.wiram.backend.entity.AuthSession;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {
  Optional<AuthSession> findByToken(String token);
  Optional<AuthSession> findByTokenAndExpiresAtAfter(String token, OffsetDateTime now);

  @Modifying
  @Query("delete from AuthSession s where s.expiresAt < :now")
  void deleteExpired(OffsetDateTime now);
}
