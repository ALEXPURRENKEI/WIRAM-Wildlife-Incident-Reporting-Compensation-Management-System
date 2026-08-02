package com.wiram.backend.dto;

public record MpesaPaymentResponse(
    String status,
    String message,
    String checkoutRequestId,
    String merchantRequestId,
    String phoneNumber,
    long amount) {}
