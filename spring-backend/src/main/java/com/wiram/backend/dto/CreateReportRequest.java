package com.wiram.backend.dto;

import java.math.BigDecimal;
import com.wiram.backend.entity.PaymentMode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateReportRequest(
    @NotBlank @Size(max = 120) String animalType,
    @NotBlank @Size(max = 120) String incidentType,
    @NotBlank @Size(max = 190) String location,
    @NotBlank @Size(max = 4000) String description,
    @NotNull @DecimalMin("0.00") BigDecimal estimatedLoss,
    @NotNull PaymentMode paymentMode,
    @Size(max = 255) String evidenceName,
    String evidenceData) {}
