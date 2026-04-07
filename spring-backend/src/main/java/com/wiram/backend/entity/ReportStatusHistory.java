package com.wiram.backend.entity;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "report_status_history")
public class ReportStatusHistory {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "report_id", nullable = false)
  private Report report;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ReportStatus status;

  @Column(columnDefinition = "text")
  private String notes;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "changed_by")
  private User changedBy;

  @Column(name = "changed_by_name")
  private String changedByName;

  @Column(name = "changed_at", nullable = false)
  private OffsetDateTime changedAt;

  @jakarta.persistence.PrePersist
  public void ensureTimestamp() {
    if (changedAt == null) {
      changedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Report getReport() {
    return report;
  }

  public void setReport(Report report) {
    this.report = report;
  }

  public ReportStatus getStatus() {
    return status;
  }

  public void setStatus(ReportStatus status) {
    this.status = status;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public User getChangedBy() {
    return changedBy;
  }

  public void setChangedBy(User changedBy) {
    this.changedBy = changedBy;
  }

  public String getChangedByName() {
    return changedByName;
  }

  public void setChangedByName(String changedByName) {
    this.changedByName = changedByName;
  }

  public OffsetDateTime getChangedAt() {
    return changedAt;
  }

  public void setChangedAt(OffsetDateTime changedAt) {
    this.changedAt = changedAt;
  }
}
