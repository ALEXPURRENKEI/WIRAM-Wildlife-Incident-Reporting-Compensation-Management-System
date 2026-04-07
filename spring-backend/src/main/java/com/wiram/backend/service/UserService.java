package com.wiram.backend.service;

import com.wiram.backend.dto.UpdateUserRoleRequest;
import com.wiram.backend.dto.UserResponse;
import com.wiram.backend.entity.User;
import com.wiram.backend.entity.UserRole;
import com.wiram.backend.exception.BadRequestException;
import com.wiram.backend.exception.NotFoundException;
import com.wiram.backend.repository.UserRepository;
import com.wiram.backend.util.AccessControl;
import com.wiram.backend.util.ApiMapper;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

  private final UserRepository userRepository;

  public UserService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Transactional(readOnly = true)
  public List<UserResponse> listUsers(User currentUser, UserRole roleFilter) {
    AccessControl.requireRole(currentUser, UserRole.ADMIN);

    List<User> users =
        roleFilter == null
            ? userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
            : userRepository.findAllByRoleOrderByCreatedAtDesc(roleFilter);

    return users.stream().map(ApiMapper::toUserResponse).toList();
  }

  @Transactional
  public UserResponse updateUserRole(User currentUser, UUID userId, UpdateUserRoleRequest request) {
    AccessControl.requireRole(currentUser, UserRole.ADMIN);

    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new NotFoundException("User not found."));

    if (currentUser.getId().equals(user.getId()) && request.role() != UserRole.ADMIN) {
      throw new BadRequestException("You cannot remove your own admin role.");
    }

    user.setRole(request.role());
    return ApiMapper.toUserResponse(userRepository.save(user));
  }

  @Transactional(readOnly = true)
  public long countByRole(UserRole role) {
    return userRepository.countByRole(role);
  }
}
