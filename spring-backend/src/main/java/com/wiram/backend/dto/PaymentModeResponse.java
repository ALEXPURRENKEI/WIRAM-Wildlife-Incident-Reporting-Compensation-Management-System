package com.wiram.backend.dto;

import com.wiram.backend.entity.PaymentMode;

public class PaymentModeResponse {
  private PaymentMode paymentMode;

  public PaymentModeResponse() {}

  public PaymentModeResponse(PaymentMode paymentMode) {
    this.paymentMode = paymentMode;
  }

  public PaymentMode getPaymentMode() {
    return paymentMode;
  }

  public void setPaymentMode(PaymentMode paymentMode) {
    this.paymentMode = paymentMode;
  }
}
