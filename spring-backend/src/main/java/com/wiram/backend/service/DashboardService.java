package com.wiram.backend.service;

import com.wiram.backend.dto.DashboardResponse;
import com.wiram.backend.dto.MonthlyCountResponse;
import com.wiram.backend.dto.ReportListResponse;
import com.wiram.backend.dto.StatusCountResponse;
import com.wiram.backend.entity.Report;
import com.wiram.backend.entity.ReportStatus;
import com.wiram.backend.entity.User;
import com.wiram.backend.entity.UserRole;
import com.wiram.backend.repository.ReportRepository;
import com.wiram.backend.repository.UserRepository;
import com.wiram.backend.util.ApiMapper;
import java.time.YearMonth;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

  private final ReportRepository reportRepository;
  private final UserRepository userRepository;

  public DashboardService(ReportRepository reportRepository, UserRepository userRepository) {
    this.reportRepository = reportRepository;
    this.userRepository = userRepository;
  }

  @Transactional(readOnly = true)
  public DashboardResponse buildDashboard(User currentUser) {
    List<Report> reports = loadScopedReports(currentUser);
    Map<ReportStatus, Long> counts = new EnumMap<>(ReportStatus.class);
    for (ReportStatus status : ReportStatus.values()) {
      counts.put(status, 0L);
    }

    for (Report report : reports) {
      counts.put(report.getStatus(), counts.get(report.getStatus()) + 1L);
    }

    long memberCount = 0L;
    long officerCount = 0L;
    long adminCount = 0L;
    if (currentUser.getRole() == UserRole.ADMIN) {
      memberCount = userRepository.countByRole(UserRole.MEMBER);
      officerCount = userRepository.countByRole(UserRole.OFFICER);
      adminCount = userRepository.countByRole(UserRole.ADMIN);
    }

    List<ReportListResponse> recentReports =
        reports.stream().limit(6).map(ApiMapper::toReportListResponse).toList();

    List<StatusCountResponse> statusBreakdown =
        Arrays.stream(ReportStatus.values())
            .map(status -> new StatusCountResponse(status, counts.getOrDefault(status, 0L)))
            .toList();

    List<MonthlyCountResponse> monthlyTrend =
        reports.stream()
            .collect(
                Collectors.groupingBy(
                    report -> YearMonth.from(report.getCreatedAt()),
                    TreeMap::new,
                    Collectors.counting()))
            .entrySet()
            .stream()
            .map(entry -> new MonthlyCountResponse(entry.getKey().toString(), entry.getValue()))
            .toList();

    long verifiedReports = counts.getOrDefault(ReportStatus.VERIFIED, 0L);

    return new DashboardResponse(
        reports.size(),
        counts.getOrDefault(ReportStatus.PENDING, 0L),
        verifiedReports,
        counts.getOrDefault(ReportStatus.REJECTED, 0L),
        counts.getOrDefault(ReportStatus.PAID, 0L),
        verifiedReports,
        memberCount,
        officerCount,
        adminCount,
        recentReports,
        statusBreakdown,
        monthlyTrend);
  }

  private List<Report> loadScopedReports(User currentUser) {
    if (currentUser.getRole() == UserRole.MEMBER) {
      return reportRepository.findByReporterIdOrderByCreatedAtDesc(currentUser.getId());
    }

    return reportRepository.findAllByOrderByCreatedAtDesc();
  }
}
