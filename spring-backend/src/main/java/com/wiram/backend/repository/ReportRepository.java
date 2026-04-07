package com.wiram.backend.repository;

import com.wiram.backend.entity.Report;
import com.wiram.backend.entity.ReportStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRepository extends JpaRepository<Report, UUID> {
  @EntityGraph(attributePaths = {"reporter", "reviewedBy"})
  List<Report> findAllByOrderByCreatedAtDesc();

  @EntityGraph(attributePaths = {"reporter", "reviewedBy"})
  List<Report> findByReporterIdOrderByCreatedAtDesc(UUID reporterId);

  @EntityGraph(attributePaths = {"reporter", "reviewedBy"})
  List<Report> findByReporterIdAndStatusOrderByCreatedAtDesc(UUID reporterId, ReportStatus status);

  @EntityGraph(attributePaths = {"reporter", "reviewedBy"})
  Optional<Report> findById(UUID id);

  @EntityGraph(attributePaths = {"reporter", "reviewedBy"})
  List<Report> findAllByStatusOrderByCreatedAtDesc(ReportStatus status);

  long countByStatus(ReportStatus status);
  long countByReporterId(UUID reporterId);
  long countByReporterIdAndStatus(UUID reporterId, ReportStatus status);

  boolean existsByIdAndReporterId(UUID id, UUID reporterId);
}
