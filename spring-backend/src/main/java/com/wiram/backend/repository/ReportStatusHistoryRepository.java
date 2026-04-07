package com.wiram.backend.repository;

import com.wiram.backend.entity.ReportStatusHistory;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportStatusHistoryRepository extends JpaRepository<ReportStatusHistory, Long> {
  @EntityGraph(attributePaths = {"report", "changedBy"})
  List<ReportStatusHistory> findByReportIdOrderByChangedAtDesc(UUID reportId);
}
