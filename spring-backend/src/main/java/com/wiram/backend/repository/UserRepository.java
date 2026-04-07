package com.wiram.backend.repository;

import com.wiram.backend.entity.User;
import com.wiram.backend.entity.UserRole;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByEmailIgnoreCase(String email);
  boolean existsByEmailIgnoreCase(String email);
  List<User> findAllByRoleOrderByCreatedAtDesc(UserRole role);
  long countByRole(UserRole role);
}
