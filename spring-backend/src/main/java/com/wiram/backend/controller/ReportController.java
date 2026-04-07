package com.wiram.backend.controller;

import com.wiram.backend.dto.CreateReportRequest;
import com.wiram.backend.dto.ReportDetailResponse;
import com.wiram.backend.dto.ReportListResponse;
import com.wiram.backend.dto.ReportStatusHistoryResponse;
import com.wiram.backend.dto.UpdateReportStatusRequest;
import com.wiram.backend.entity.ReportStatus;
import com.wiram.backend.entity.User;
import com.wiram.backend.service.AuthService;
import com.wiram.backend.service.ReportService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/reports")
public class ReportController {

  private final AuthService authService;
  private final ReportService reportService;

  public ReportController(AuthService authService, ReportService reportService) {
    this.authService = authService;
    this.reportService = reportService;
  }

  @PostMapping
  public ResponseEntity<ReportDetailResponse> create(
      HttpServletRequest request, @Valid @RequestBody CreateReportRequest payload) {
    User currentUser = authService.requireUser(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(reportService.createReport(currentUser, payload));
  }

  @GetMapping
  public ResponseEntity<List<ReportListResponse>> list(
      HttpServletRequest request, @RequestParam(required = false) ReportStatus status) {
    User currentUser = authService.requireUser(request);
    return ResponseEntity.ok(reportService.listReports(currentUser, status));
  }

  @GetMapping("/my")
  public ResponseEntity<List<ReportListResponse>> myReports(
      HttpServletRequest request, @RequestParam(required = false) ReportStatus status) {
    User currentUser = authService.requireUser(request);
    return ResponseEntity.ok(reportService.listMyReports(currentUser, status));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ReportDetailResponse> details(
      HttpServletRequest request, @PathVariable UUID id) {
    User currentUser = authService.requireUser(request);
    return ResponseEntity.ok(reportService.getReport(currentUser, id));
  }

  @GetMapping("/{id}/history")
  public ResponseEntity<List<ReportStatusHistoryResponse>> history(
      HttpServletRequest request, @PathVariable UUID id) {
    User currentUser = authService.requireUser(request);
    return ResponseEntity.ok(reportService.getHistory(currentUser, id));
  }

  @PatchMapping("/{id}/status")
  public ResponseEntity<ReportDetailResponse> updateStatus(
      HttpServletRequest request,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateReportStatusRequest payload) {
    User currentUser = authService.requireUser(request);
    return ResponseEntity.ok(reportService.updateStatus(currentUser, id, payload));
  }
}
