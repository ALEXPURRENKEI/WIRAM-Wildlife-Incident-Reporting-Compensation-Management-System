package com.wiram.backend.dto;

import com.wiram.backend.entity.PaymentMode;

public class UpdatePaymentModeRequest {
  private PaymentMode paymentMode;

  public UpdatePaymentModeRequest() {}

  public UpdatePaymentModeRequest(PaymentMode paymentMode) {
    this.paymentMode = paymentMode;
  }

  public PaymentMode getPaymentMode() {
    return paymentMode;
  }

  public void setPaymentMode(PaymentMode paymentMode) {
    this.paymentMode = paymentMode;
  }
}
