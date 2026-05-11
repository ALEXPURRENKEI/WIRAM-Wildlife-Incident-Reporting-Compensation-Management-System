package com.wiram.backend.service;

import com.wiram.backend.dto.CreateReportRequest;
import com.wiram.backend.dto.ReportDetailResponse;
import com.wiram.backend.dto.ReportListResponse;
import com.wiram.backend.dto.ReportStatusHistoryResponse;
import com.wiram.backend.dto.UpdateReportStatusRequest;
import com.wiram.backend.dto.UpdatePaymentModeRequest;
import com.wiram.backend.entity.Report;
import com.wiram.backend.entity.ReportStatus;
import com.wiram.backend.entity.ReportStatusHistory;
import com.wiram.backend.entity.User;
import com.wiram.backend.entity.UserRole;
import com.wiram.backend.exception.ForbiddenException;
import com.wiram.backend.exception.NotFoundException;
import com.wiram.backend.repository.ReportRepository;
import com.wiram.backend.repository.ReportStatusHistoryRepository;
import com.wiram.backend.repository.UserRepository;
import com.wiram.backend.util.AccessControl;
import com.wiram.backend.util.ApiMapper;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportService {

  private final ReportRepository reportRepository;
  private final ReportStatusHistoryRepository historyRepository;
  private final UserRepository userRepository;

  public ReportService(
      ReportRepository reportRepository,
      ReportStatusHistoryRepository historyRepository,
      UserRepository userRepository) {
    this.reportRepository = reportRepository;
    this.historyRepository = historyRepository;
    this.userRepository = userRepository;
  }

  @Transactional
  public ReportDetailResponse createReport(User currentUser, CreateReportRequest request) {
    AccessControl.requireRole(currentUser, UserRole.MEMBER);

    User reporter = userRepository.getReferenceById(currentUser.getId());
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

    Report report = new Report();
    report.setReporter(reporter);
    report.setAnimalType(request.animalType().trim());
    report.setIncidentType(request.incidentType().trim());
    report.setLocation(request.location().trim());
    report.setDescription(request.description().trim());
    report.setEstimatedLoss(request.estimatedLoss());
    report.setEvidenceName(normalizeText(request.evidenceName()));
    report.setEvidenceData(normalizeText(request.evidenceData()));
    report.setStatus(ReportStatus.PENDING);
    report.setReviewedBy(null);
    report.setReviewedByName(null);
    report.setReviewedAt(null);
    report.setCreatedAt(now);
    report.setUpdatedAt(now);
    report = reportRepository.save(report);

    ReportStatusHistory history = new ReportStatusHistory();
    history.setReport(report);
    history.setStatus(ReportStatus.PENDING);
    history.setNotes("Report submitted.");
    history.setChangedBy(reporter);
    history.setChangedByName(currentUser.getName());
    history.setChangedAt(now);
    historyRepository.save(history);

    return buildDetailResponse(report.getId());
  }

  @Transactional(readOnly = true)
  public List<ReportListResponse> listReports(User currentUser, ReportStatus statusFilter) {
    List<Report> reports = loadAccessibleReports(currentUser, statusFilter);
    return reports.stream().map(ApiMapper::toReportListResponse).toList();
  }

  @Transactional(readOnly = true)
  public List<ReportListResponse> listMyReports(User currentUser, ReportStatus statusFilter) {
    List<Report> reports = loadReportsByReporter(currentUser.getId(), statusFilter);
    return reports.stream().map(ApiMapper::toReportListResponse).toList();
  }

  @Transactional(readOnly = true)
  public ReportDetailResponse getReport(User currentUser, UUID reportId) {
    Report report = fetchReport(reportId);
    ensureCanViewReport(currentUser, report);
    return buildDetailResponse(report);
  }

  @Transactional(readOnly = true)
  public List<ReportStatusHistoryResponse> getHistory(User currentUser, UUID reportId) {
    Report report = fetchReport(reportId);
    ensureCanViewReport(currentUser, report);
    return historyRepository.findByReportIdOrderByChangedAtDesc(report.getId()).stream()
        .map(ApiMapper::toHistoryResponse)
        .toList();
  }

  @Transactional
  public ReportDetailResponse updateStatus(
      User currentUser, UUID reportId, UpdateReportStatusRequest request) {
    AccessControl.requireRole(currentUser, UserRole.OFFICER, UserRole.ADMIN);

    Report report = fetchReport(reportId);
    User reviewer = userRepository.getReferenceById(currentUser.getId());
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

    report.setStatus(request.status());
    report.setReviewedBy(reviewer);
    report.setReviewedByName(currentUser.getName());
    report.setReviewedAt(now);
    reportRepository.save(report);

    ReportStatusHistory history = new ReportStatusHistory();
    history.setReport(report);
    history.setStatus(request.status());
    history.setNotes(buildHistoryNotes(request));
    history.setChangedBy(reviewer);
    history.setChangedByName(currentUser.getName());
    history.setChangedAt(now);
    historyRepository.save(history);

    return buildDetailResponse(report.getId());
  }

  @Transactional
  public ReportDetailResponse updatePaymentMode(
      User currentUser, UUID reportId, UpdatePaymentModeRequest request) {
    Report report = fetchReport(reportId);

    if (currentUser.getRole() == UserRole.MEMBER) {
      if (!currentUser.getId().equals(report.getReporter().getId())) {
        throw new ForbiddenException("You can only update payment mode for your own reports.");
      }
    } else if (currentUser.getRole() != UserRole.OFFICER && currentUser.getRole() != UserRole.ADMIN) {
      throw new ForbiddenException("You do not have permission to update payment mode.");
    }

    report.setPaymentMode(request.getPaymentMode());
    reportRepository.save(report);
    return buildDetailResponse(report);
  }

  private ReportDetailResponse buildDetailResponse(UUID reportId) {
    Report report = fetchReport(reportId);
    return buildDetailResponse(report);
  }

  private ReportDetailResponse buildDetailResponse(Report report) {
    List<ReportStatusHistory> histories =
        historyRepository.findByReportIdOrderByChangedAtDesc(report.getId());
    return ApiMapper.toReportDetailResponse(report, histories);
  }

  private Report fetchReport(UUID reportId) {
    return reportRepository
        .findById(reportId)
        .orElseThrow(() -> new NotFoundException("Report not found."));
  }

  private List<Report> loadAccessibleReports(User currentUser, ReportStatus statusFilter) {
    if (currentUser.getRole() == UserRole.MEMBER) {
      return loadReportsByReporter(currentUser.getId(), statusFilter);
    }

    if (statusFilter == null) {
      return reportRepository.findAllByOrderByCreatedAtDesc();
    }

    return reportRepository.findAllByStatusOrderByCreatedAtDesc(statusFilter);
  }

  private List<Report> loadReportsByReporter(UUID reporterId, ReportStatus statusFilter) {
    if (statusFilter == null) {
      return reportRepository.findByReporterIdOrderByCreatedAtDesc(reporterId);
    }

    return reportRepository.findByReporterIdAndStatusOrderByCreatedAtDesc(reporterId, statusFilter);
  }

  private void ensureCanViewReport(User currentUser, Report report) {
    if (currentUser.getRole() == UserRole.ADMIN || currentUser.getRole() == UserRole.OFFICER) {
      return;
    }

    if (currentUser.getRole() == UserRole.MEMBER
        && report.getReporter() != null
        && currentUser.getId().equals(report.getReporter().getId())) {
      return;
    }

    throw new ForbiddenException("You do not have permission to view this report.");
  }

  private String buildHistoryNotes(UpdateReportStatusRequest request) {
    if (request.notes() != null && !request.notes().isBlank()) {
      return request.notes().trim();
    }

    return "Status changed to " + request.status().name().toLowerCase() + ".";
  }

  private String normalizeText(String value) {
    if (value == null) {
      return null;
    }

    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
