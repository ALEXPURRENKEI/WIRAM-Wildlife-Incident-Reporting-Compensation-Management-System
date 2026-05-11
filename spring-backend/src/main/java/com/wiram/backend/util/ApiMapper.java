package com.wiram.backend.util;

import com.wiram.backend.dto.ReportDetailResponse;
import com.wiram.backend.dto.ReportListResponse;
import com.wiram.backend.dto.ReportStatusHistoryResponse;
import com.wiram.backend.dto.UserResponse;
import com.wiram.backend.entity.Report;
import com.wiram.backend.entity.ReportStatusHistory;
import com.wiram.backend.entity.User;
import java.util.List;

public final class ApiMapper {

  private ApiMapper() {}

  public static UserResponse toUserResponse(User user) {
    return new UserResponse(
        user.getId(),
        user.getName(),
        user.getEmail(),
        user.getRole(),
        user.getPaymentMode(),
        user.getCreatedAt(),
        user.getUpdatedAt());
  }

  public static ReportListResponse toReportListResponse(Report report) {
    return new ReportListResponse(
        report.getId(),
        report.getAnimalType(),
        report.getIncidentType(),
        report.getLocation(),
        report.getEstimatedLoss(),
        report.getStatus(),
        report.getPaymentMode(),
        report.getReporter() == null ? null : report.getReporter().getName(),
        report.getReporter() == null ? null : report.getReporter().getEmail(),
        report.getReviewedByName(),
        report.getReviewedAt(),
        report.getCreatedAt(),
        report.getUpdatedAt(),
        report.getEvidenceData() != null && !report.getEvidenceData().isBlank());
  }

  public static ReportDetailResponse toReportDetailResponse(
      Report report, List<ReportStatusHistory> histories) {
    return new ReportDetailResponse(
        report.getId(),
        report.getAnimalType(),
        report.getIncidentType(),
        report.getLocation(),
        report.getDescription(),
        report.getEstimatedLoss(),
        report.getEvidenceName(),
        report.getEvidenceData(),
        report.getStatus(),
        report.getPaymentMode(),
        report.getReporter() == null ? null : report.getReporter().getName(),
        report.getReporter() == null ? null : report.getReporter().getEmail(),
        report.getReviewedByName(),
        report.getReviewedAt(),
        report.getCreatedAt(),
        report.getUpdatedAt(),
        report.getEvidenceData() != null && !report.getEvidenceData().isBlank(),
        histories.stream().map(ApiMapper::toHistoryResponse).toList());
  }

  public static ReportStatusHistoryResponse toHistoryResponse(ReportStatusHistory history) {
    return new ReportStatusHistoryResponse(
        history.getId(),
        history.getStatus(),
        history.getNotes(),
        history.getChangedByName(),
        history.getChangedAt());
  }
}
