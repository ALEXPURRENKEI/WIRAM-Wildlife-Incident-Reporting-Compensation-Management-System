package com.wiram.backend.entity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "reports")
public class Report extends BaseEntity {

  @Id
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "reporter_id", nullable = false)
  private User reporter;

  @Column(name = "animal_type", nullable = false)
  private String animalType;

  @Column(name = "incident_type", nullable = false)
  private String incidentType;

  @Column(nullable = false)
  private String location;

  @Column(nullable = false, columnDefinition = "text")
  private String description;

  @Column(name = "estimated_loss", nullable = false, precision = 12, scale = 2)
  private BigDecimal estimatedLoss;

  @Column(name = "evidence_name")
  private String evidenceName;

  @Column(name = "evidence_data", columnDefinition = "text")
  private String evidenceData;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ReportStatus status;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "reviewed_by")
  private User reviewedBy;

  @Column(name = "reviewed_by_name")
  private String reviewedByName;

  @Column(name = "reviewed_at")
  private OffsetDateTime reviewedAt;

  @Enumerated(EnumType.STRING)
  @Column(name = "payment_mode")
  private PaymentMode paymentMode;

  @PrePersist
  public void ensureId() {
    if (id == null) {
      id = UUID.randomUUID();
    }
  }

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public User getReporter() {
    return reporter;
  }

  public void setReporter(User reporter) {
    this.reporter = reporter;
  }

  public String getAnimalType() {
    return animalType;
  }

  public void setAnimalType(String animalType) {
    this.animalType = animalType;
  }

  public String getIncidentType() {
    return incidentType;
  }

  public void setIncidentType(String incidentType) {
    this.incidentType = incidentType;
  }

  public String getLocation() {
    return location;
  }

  public void setLocation(String location) {
    this.location = location;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public BigDecimal getEstimatedLoss() {
    return estimatedLoss;
  }

  public void setEstimatedLoss(BigDecimal estimatedLoss) {
    this.estimatedLoss = estimatedLoss;
  }

  public String getEvidenceName() {
    return evidenceName;
  }

  public void setEvidenceName(String evidenceName) {
    this.evidenceName = evidenceName;
  }

  public String getEvidenceData() {
    return evidenceData;
  }

  public void setEvidenceData(String evidenceData) {
    this.evidenceData = evidenceData;
  }

  public ReportStatus getStatus() {
    return status;
  }

  public void setStatus(ReportStatus status) {
    this.status = status;
  }

  public User getReviewedBy() {
    return reviewedBy;
  }

  public void setReviewedBy(User reviewedBy) {
    this.reviewedBy = reviewedBy;
  }

  public String getReviewedByName() {
    return reviewedByName;
  }

  public void setReviewedByName(String reviewedByName) {
    this.reviewedByName = reviewedByName;
  }

  public OffsetDateTime getReviewedAt() {
    return reviewedAt;
  }

  public void setReviewedAt(OffsetDateTime reviewedAt) {
    this.reviewedAt = reviewedAt;
  }

  public PaymentMode getPaymentMode() {
    return paymentMode;
  }

  public void setPaymentMode(PaymentMode paymentMode) {
    this.paymentMode = paymentMode;
  }
}
