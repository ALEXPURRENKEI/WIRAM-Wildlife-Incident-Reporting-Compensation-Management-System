package com.wiram.backend.controller;

import com.wiram.backend.dto.DashboardResponse;
import com.wiram.backend.entity.User;
import com.wiram.backend.entity.UserRole;
import com.wiram.backend.service.AuthService;
import com.wiram.backend.service.DashboardService;
import com.wiram.backend.util.AccessControl;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/dashboard")
public class DashboardController {

  private final AuthService authService;
  private final DashboardService dashboardService;

  public DashboardController(AuthService authService, DashboardService dashboardService) {
    this.authService = authService;
    this.dashboardService = dashboardService;
  }

  @GetMapping
  public ResponseEntity<DashboardResponse> dashboard(HttpServletRequest request) {
    User currentUser = authService.requireUser(request);
    return ResponseEntity.ok(dashboardService.buildDashboard(currentUser));
  }

  @GetMapping("/member")
  public ResponseEntity<DashboardResponse> memberDashboard(HttpServletRequest request) {
    User currentUser = authService.requireUser(request);
    AccessControl.requireRole(currentUser, UserRole.MEMBER);
    return ResponseEntity.ok(dashboardService.buildDashboard(currentUser));
  }

  @GetMapping("/officer")
  public ResponseEntity<DashboardResponse> officerDashboard(HttpServletRequest request) {
    User currentUser = authService.requireUser(request);
    AccessControl.requireRole(currentUser, UserRole.OFFICER, UserRole.ADMIN);
    return ResponseEntity.ok(dashboardService.buildDashboard(currentUser));
  }

  @GetMapping("/admin")
  public ResponseEntity<DashboardResponse> adminDashboard(HttpServletRequest request) {
    User currentUser = authService.requireUser(request);
    AccessControl.requireRole(currentUser, UserRole.ADMIN);
    return ResponseEntity.ok(dashboardService.buildDashboard(currentUser));
  }
}
