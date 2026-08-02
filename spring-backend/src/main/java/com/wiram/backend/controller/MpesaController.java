package com.wiram.backend.controller;

import com.wiram.backend.dto.MpesaPaymentRequest;
import com.wiram.backend.dto.MpesaPaymentResponse;
import com.wiram.backend.entity.User;
import com.wiram.backend.entity.UserRole;
import com.wiram.backend.service.AuthService;
import com.wiram.backend.service.MpesaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/payments")
public class MpesaController {

  private final AuthService authService;
  private final MpesaService mpesaService;

  public MpesaController(AuthService authService, MpesaService mpesaService) {
    this.authService = authService;
    this.mpesaService = mpesaService;
  }

  @PostMapping("/mpesa")
  public ResponseEntity<MpesaPaymentResponse> initiatePayment(
      HttpServletRequest request, @Valid @RequestBody MpesaPaymentRequest payload) {
    User currentUser = authService.requireUser(request);
    authService.requireRole(currentUser, UserRole.OFFICER, UserRole.ADMIN);
    return ResponseEntity.ok(mpesaService.initiatePayment(payload));
  }
}
