package com.wiram.backend.controller;

import com.wiram.backend.dto.UpdateUserRoleRequest;
import com.wiram.backend.dto.UserResponse;
import com.wiram.backend.dto.UpdatePaymentModeRequest;
import com.wiram.backend.dto.PaymentModeResponse;
import com.wiram.backend.entity.User;
import com.wiram.backend.entity.UserRole;
import com.wiram.backend.service.AuthService;
import com.wiram.backend.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/users")
public class UserController {

  private final AuthService authService;
  private final UserService userService;

  public UserController(AuthService authService, UserService userService) {
    this.authService = authService;
    this.userService = userService;
  }

  @GetMapping
  public ResponseEntity<List<UserResponse>> listUsers(
      HttpServletRequest request, @RequestParam(required = false) UserRole role) {
    User currentUser = authService.requireUser(request);
    return ResponseEntity.ok(userService.listUsers(currentUser, role));
  }

  @PatchMapping("/{id}/role")
  public ResponseEntity<UserResponse> updateRole(
      HttpServletRequest request,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateUserRoleRequest payload) {
    User currentUser = authService.requireUser(request);
    return ResponseEntity.ok(userService.updateUserRole(currentUser, id, payload));
  }

  @PatchMapping("/me/payment-mode")
  public ResponseEntity<PaymentModeResponse> updateMyPaymentMode(
      HttpServletRequest request,
      @Valid @RequestBody UpdatePaymentModeRequest payload) {
    User currentUser = authService.requireUser(request);
    return ResponseEntity.ok(userService.updatePaymentMode(currentUser, payload));
  }
}
