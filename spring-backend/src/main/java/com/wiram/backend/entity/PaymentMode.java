package com.wiram.backend.entity;

public enum PaymentMode {
  MPESA("M-Pesa"),
  BANK_TRANSFER("Bank Transfer"),
  CASH("Cash"),
  CHEQUE("Cheque");

  private final String displayName;

  PaymentMode(String displayName) {
    this.displayName = displayName;
  }

  public String getDisplayName() {
    return displayName;
  }
}
