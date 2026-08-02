package com.wiram.backend.service;

import com.wiram.backend.dto.MpesaPaymentRequest;
import com.wiram.backend.dto.MpesaPaymentResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

@Service
public class MpesaService {

  private static final DateTimeFormatter TIMESTAMP_FORMATTER =
      DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

  private final RestTemplate restTemplate;
  private final boolean enabled;
  private final String consumerKey;
  private final String consumerSecret;
  private final String shortCode;
  private final String passkey;
  private final String stkPushUrl;
  private final String authUrl;
  private final String callbackUrl;

  public MpesaService(
      RestTemplateBuilder restTemplateBuilder,
      @Value("${mpesa.enabled:false}") boolean enabled,
      @Value("${mpesa.consumer-key:}") String consumerKey,
      @Value("${mpesa.consumer-secret:}") String consumerSecret,
      @Value("${mpesa.short-code:}") String shortCode,
      @Value("${mpesa.passkey:}") String passkey,
      @Value("${mpesa.stk-push-url:https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest}") String stkPushUrl,
      @Value("${mpesa.auth-url:https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials}") String authUrl,
      @Value("${mpesa.callback-url:https://example.com/mpesa/callback}") String callbackUrl) {
    this.restTemplate = restTemplateBuilder.build();
    this.enabled = enabled;
    this.consumerKey = consumerKey == null ? "" : consumerKey.trim();
    this.consumerSecret = consumerSecret == null ? "" : consumerSecret.trim();
    this.shortCode = shortCode == null ? "" : shortCode.trim();
    this.passkey = passkey == null ? "" : passkey.trim();
    this.stkPushUrl = stkPushUrl;
    this.authUrl = authUrl;
    this.callbackUrl = callbackUrl;
  }

  public MpesaPaymentResponse initiatePayment(MpesaPaymentRequest request) {
    String normalizedPhone = normalizeMsisdn(request.phoneNumber());
    if (!StringUtils.hasText(normalizedPhone)) {
      throw new IllegalArgumentException("Enter the M-Pesa phone number.");
    }

    if (!enabled || consumerKey.isBlank() || consumerSecret.isBlank() || shortCode.isBlank() || passkey.isBlank()) {
      return buildDemoResponse(request, normalizedPhone);
    }

    try {
      String accessToken = fetchAccessToken();
      String timestamp = LocalDateTime.now(ZoneOffset.UTC).format(TIMESTAMP_FORMATTER);
      String password =
          Base64.getEncoder()
              .encodeToString((shortCode + passkey + timestamp).getBytes(StandardCharsets.UTF_8));

      Map<String, Object> payload = new LinkedHashMap<>();
      payload.put("BusinessShortCode", shortCode);
      payload.put("Password", password);
      payload.put("Timestamp", timestamp);
      payload.put("TransactionType", "CustomerPayBillOnline");
      payload.put("Amount", String.valueOf(request.amount()));
      payload.put("PartyA", normalizedPhone);
      payload.put("PartyB", shortCode);
      payload.put("PhoneNumber", normalizedPhone);
      payload.put("CallBackURL", callbackUrl);
      payload.put("AccountReference", StringUtils.hasText(request.reference()) ? request.reference() : "WIRAM");
      payload.put("TransactionDesc", "WIRAM compensation payment");

      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);
      headers.setBearerAuth(accessToken);

      HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
      ResponseEntity<Map> response = restTemplate.postForEntity(stkPushUrl, entity, Map.class);
      Map<String, Object> body = response.getBody() == null ? Collections.emptyMap() : response.getBody();

      String checkoutRequestId = asString(body.get("CheckoutRequestID"));
      String merchantRequestId = asString(body.get("MerchantRequestID"));
      String responseDescription = asString(body.get("ResponseDescription"));
      if (response.getStatusCode().is2xxSuccessful()) {
        return new MpesaPaymentResponse(
            "pending",
            responseDescription != null ? responseDescription : "M-Pesa PIN prompt sent successfully.",
            checkoutRequestId,
            merchantRequestId,
            normalizedPhone,
            request.amount());
      }

      return new MpesaPaymentResponse(
          "failed",
          responseDescription != null ? responseDescription : "M-Pesa could not initiate the payment.",
          checkoutRequestId,
          merchantRequestId,
          normalizedPhone,
          request.amount());
    } catch (HttpStatusCodeException exception) {
      String detail = exception.getResponseBodyAsString();
      return new MpesaPaymentResponse(
          "failed",
          "M-Pesa request failed: " + detail,
          null,
          null,
          normalizedPhone,
          request.amount());
    } catch (Exception exception) {
      throw new IllegalStateException("Unable to initiate M-Pesa payment.", exception);
    }
  }

  private String fetchAccessToken() {
    HttpHeaders headers = new HttpHeaders();
    headers.setBasicAuth(consumerKey, consumerSecret);
    HttpEntity<Void> entity = new HttpEntity<>(headers);
    ResponseEntity<Map> response = restTemplate.exchange(authUrl, HttpMethod.GET, entity, Map.class);
    Map<String, Object> body = response.getBody() == null ? Collections.emptyMap() : response.getBody();
    String token = asString(body.get("access_token"));
    if (!StringUtils.hasText(token)) {
      throw new IllegalStateException("M-Pesa authentication did not return an access token.");
    }
    return token;
  }

  private MpesaPaymentResponse buildDemoResponse(MpesaPaymentRequest request, String normalizedPhone) {
    return new MpesaPaymentResponse(
        "simulated",
        "M-Pesa demo mode is active. The PIN prompt is ready for " + normalizedPhone + " for KES " + request.amount() + ".",
        null,
        null,
        normalizedPhone,
        request.amount());
  }

  private String normalizeMsisdn(String rawPhone) {
    if (!StringUtils.hasText(rawPhone)) {
      return "";
    }

    String digits = rawPhone.replaceAll("\\D", "");
    if (digits.isBlank()) {
      return "";
    }
    if (digits.startsWith("254")) {
      return digits;
    }
    if (digits.startsWith("07")) {
      return "254" + digits.substring(1);
    }
    if (digits.startsWith("7")) {
      return "254" + digits;
    }
    if (digits.startsWith("0")) {
      return "254" + digits.substring(1);
    }
    return digits;
  }

  private String asString(Object value) {
    return value == null ? null : String.valueOf(value);
  }
}
