package com.wiram.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record MpesaPaymentRequest(
    @NotBlank(message = "Enter the payee phone number.") String phoneNumber,
    @Positive(message = "The payment amount must be greater than zero.") long amount,
    @NotBlank(message = "Enter the partner name.") String partnerName,
    String reference) {}
