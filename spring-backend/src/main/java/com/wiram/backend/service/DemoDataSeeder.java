package com.wiram.backend.service;

import com.wiram.backend.entity.Report;
import com.wiram.backend.entity.ReportStatus;
import com.wiram.backend.entity.ReportStatusHistory;
import com.wiram.backend.entity.User;
import com.wiram.backend.entity.UserRole;
import com.wiram.backend.repository.ReportRepository;
import com.wiram.backend.repository.ReportStatusHistoryRepository;
import com.wiram.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DemoDataSeeder implements ApplicationRunner {

  private final UserRepository userRepository;
  private final ReportRepository reportRepository;
  private final ReportStatusHistoryRepository historyRepository;
  private final PasswordEncoder passwordEncoder;

  @Value("${SEED_DEMO_DATA:true}")
  private boolean seedDemoData;

  public DemoDataSeeder(
      UserRepository userRepository,
      ReportRepository reportRepository,
      ReportStatusHistoryRepository historyRepository,
      PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.reportRepository = reportRepository;
    this.historyRepository = historyRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (!seedDemoData) {
      return;
    }

    User member =
        ensureUser("Community Member", "member@wiram.org", UserRole.MEMBER, "password123");
    User officer =
        ensureUser("Wildlife Officer", "officer@wiram.org", UserRole.OFFICER, "password123");
    User admin = ensureUser("System Admin", "admin@wiram.org", UserRole.ADMIN, "password123");

    if (reportRepository.count() == 0) {
      List<Report> seededReports =
          List.of(
              createPendingReport(member),
              createVerifiedReport(member, officer),
              createRejectedReport(member, officer),
              createPaidReport(member, officer, admin));
      reportRepository.saveAll(seededReports);
      seedHistoriesForReport(seededReports.get(0));
      seedHistoriesForReport(seededReports.get(1));
      seedHistoriesForReport(seededReports.get(2));
      seedPaidHistories(seededReports.get(3), member, officer, admin);
    }
  }

  private User ensureUser(String name, String email, UserRole role, String password) {
    return userRepository
        .findByEmailIgnoreCase(email)
        .orElseGet(
            () -> {
              User user = new User();
              user.setName(name);
              user.setEmail(email);
              user.setPasswordHash(passwordEncoder.encode(password));
              user.setRole(role);
              return userRepository.save(user);
            });
  }

  private Report createPendingReport(User member) {
    OffsetDateTime submittedAt = OffsetDateTime.of(2026, 1, 12, 9, 30, 0, 0, ZoneOffset.UTC);
    Report report = baseReport(member, "Elephant", "Crop destruction", "Kajiado Farmland", submittedAt);
    report.setStatus(ReportStatus.PENDING);
    report.setReviewedBy(null);
    report.setReviewedByName(null);
    report.setReviewedAt(null);
    report.setCreatedAt(submittedAt);
    report.setUpdatedAt(submittedAt);
    report.setEvidenceData(sampleEvidence("Elephant raid"));
    return report;
  }

  private Report createVerifiedReport(User member, User officer) {
    OffsetDateTime submittedAt = OffsetDateTime.of(2026, 2, 19, 11, 15, 0, 0, ZoneOffset.UTC);
    OffsetDateTime reviewedAt = OffsetDateTime.of(2026, 2, 20, 8, 45, 0, 0, ZoneOffset.UTC);
    Report report = baseReport(member, "Buffalo", "Property damage", "Narok Village", submittedAt);
    report.setStatus(ReportStatus.VERIFIED);
    report.setReviewedBy(officer);
    report.setReviewedByName(officer.getName());
    report.setReviewedAt(reviewedAt);
    report.setCreatedAt(submittedAt);
    report.setUpdatedAt(reviewedAt);
    report.setEvidenceData(sampleEvidence("Buffalo incident"));
    return report;
  }

  private Report createRejectedReport(User member, User officer) {
    OffsetDateTime submittedAt = OffsetDateTime.of(2026, 3, 8, 14, 0, 0, 0, ZoneOffset.UTC);
    OffsetDateTime reviewedAt = OffsetDateTime.of(2026, 3, 9, 10, 5, 0, 0, ZoneOffset.UTC);
    Report report = baseReport(member, "Crocodile", "Livestock loss", "Lake Shore", submittedAt);
    report.setStatus(ReportStatus.REJECTED);
    report.setReviewedBy(officer);
    report.setReviewedByName(officer.getName());
    report.setReviewedAt(reviewedAt);
    report.setCreatedAt(submittedAt);
    report.setUpdatedAt(reviewedAt);
    report.setEvidenceData(sampleEvidence("Crocodile incident"));
    return report;
  }

  private Report createPaidReport(User member, User officer, User admin) {
    OffsetDateTime submittedAt = OffsetDateTime.of(2026, 4, 2, 16, 10, 0, 0, ZoneOffset.UTC);
    OffsetDateTime verifiedAt = OffsetDateTime.of(2026, 4, 4, 9, 30, 0, 0, ZoneOffset.UTC);
    OffsetDateTime paidAt = OffsetDateTime.of(2026, 4, 6, 12, 0, 0, 0, ZoneOffset.UTC);
    Report report = baseReport(member, "Hippo", "Home damage", "Bondo River Bank", submittedAt);
    report.setStatus(ReportStatus.PAID);
    report.setReviewedBy(admin);
    report.setReviewedByName(admin.getName());
    report.setReviewedAt(paidAt);
    report.setCreatedAt(submittedAt);
    report.setUpdatedAt(paidAt);
    report.setEvidenceData(sampleEvidence("Hippo incident"));
    return report;
  }

  private Report baseReport(
      User member, String animal, String incident, String location, OffsetDateTime createdAt) {
    Report report = new Report();
    report.setReporter(member);
    report.setAnimalType(animal);
    report.setIncidentType(incident);
    report.setLocation(location);
    report.setDescription(
        "A demo report for " + animal.toLowerCase() + " related " + incident.toLowerCase() + ".");
    report.setEstimatedLoss(new BigDecimal("25000.00"));
    report.setEvidenceName(animal.toLowerCase() + "-evidence.png");
    report.setCreatedAt(createdAt);
    report.setUpdatedAt(createdAt);
    return report;
  }

  private void seedHistoriesForReport(Report report) {
    if (report.getStatus() == ReportStatus.PENDING) {
      seedHistory(
          report,
          report.getReporter(),
          ReportStatus.PENDING,
          "Report submitted.",
          report.getCreatedAt());
      return;
    }

    if (report.getStatus() == ReportStatus.VERIFIED) {
      seedHistory(
          report,
          report.getReporter(),
          ReportStatus.PENDING,
          "Report submitted.",
          report.getCreatedAt());
      seedHistory(
          report,
          report.getReviewedBy(),
          ReportStatus.VERIFIED,
          "Incident verified by field officer.",
          report.getReviewedAt());
      return;
    }

    if (report.getStatus() == ReportStatus.REJECTED) {
      seedHistory(
          report,
          report.getReporter(),
          ReportStatus.PENDING,
          "Report submitted.",
          report.getCreatedAt());
      seedHistory(
          report,
          report.getReviewedBy(),
          ReportStatus.REJECTED,
          "Insufficient evidence supplied.",
          report.getReviewedAt());
    }
  }

  private void seedPaidHistories(Report report, User member, User officer, User admin) {
    seedHistory(
        report,
        member,
        ReportStatus.PENDING,
        "Report submitted.",
        report.getCreatedAt());
    seedHistory(
        report,
        officer,
        ReportStatus.VERIFIED,
        "Incident verified by field officer.",
        report.getReviewedAt().minusDays(2));
    seedHistory(
        report,
        admin,
        ReportStatus.PAID,
        "Compensation released.",
        report.getReviewedAt());
  }

  private void seedHistory(
      Report report, User changedBy, ReportStatus status, String notes, OffsetDateTime changedAt) {
    ReportStatusHistory history = new ReportStatusHistory();
    history.setReport(report);
    history.setStatus(status);
    history.setNotes(notes);
    history.setChangedBy(changedBy);
    history.setChangedByName(changedBy.getName());
    history.setChangedAt(changedAt);
    historyRepository.save(history);
  }

  private String sampleEvidence(String label) {
    String svg =
        "<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'>"
            + "<rect width='800' height='450' rx='28' fill='#0b1b3a'/>"
            + "<circle cx='400' cy='225' r='120' fill='#19e3ff' opacity='0.18'/>"
            + "<text x='50%' y='48%' dominant-baseline='middle' text-anchor='middle' fill='#eaf8ff' font-family='Arial' font-size='40' font-weight='700'>"
            + label
            + "</text>"
            + "<text x='50%' y='58%' dominant-baseline='middle' text-anchor='middle' fill='#7ccfff' font-family='Arial' font-size='20'>Demo evidence preview</text>"
            + "</svg>";
    return "data:image/svg+xml;base64,"
        + Base64.getEncoder().encodeToString(svg.getBytes(StandardCharsets.UTF_8));
  }
}
