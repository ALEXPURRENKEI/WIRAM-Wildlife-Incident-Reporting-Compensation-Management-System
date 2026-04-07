package com.wiram.backend.controller;

import com.wiram.backend.dto.HealthResponse;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

  @GetMapping("/health")
  public ResponseEntity<HealthResponse> health() {
    return ResponseEntity.ok(
        new HealthResponse("UP", "wiram-spring-backend", OffsetDateTime.now(ZoneOffset.UTC)));
  }
}
