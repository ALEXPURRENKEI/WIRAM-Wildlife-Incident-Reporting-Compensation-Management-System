package com.wiram.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wiram.backend.entity.PaymentMode;
import com.wiram.backend.entity.Report;
import com.wiram.backend.entity.ReportStatus;
import com.wiram.backend.repository.ReportRepository;
import com.wiram.backend.repository.UserRepository;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "DATABASE_URL=",
    "SPRING_DATASOURCE_URL=",
    "SEED_DEMO_DATA=false",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class FrontendDataFlowTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @Autowired
  private ReportRepository reportRepository;

  @Autowired
  private UserRepository userRepository;

  @Test
  void backendReceivesFrontendReportPayloadAndPersistsIt() throws Exception {
    String email = "frontend-flow-" + System.nanoTime() + "@example.com";
    String registerPayload = """
        {
          "name": "Frontend Flow User",
          "email": "%s",
          "password": "password123"
        }
        """.formatted(email);

    String registerResponse = mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content(registerPayload))
        .andExpect(status().isCreated())
        .andReturn()
        .getResponse()
        .getContentAsString();

    JsonNode authJson = objectMapper.readTree(registerResponse);
    String token = authJson.get("token").asText();

    String reportPayload = """
        {
          "animalType": "Elephant",
          "incidentType": "Crop Damage",
          "location": "Narok East",
          "description": "Frontend submitted crop damage report.",
          "estimatedLoss": 1200,
          "paymentMode": "MPESA",
          "evidenceName": "field-photo.jpg",
          "evidenceData": "data:image/jpeg;base64,abc123"
        }
        """;

    mockMvc.perform(post("/api/reports")
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(reportPayload))
        .andExpect(status().isCreated());

    var user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
    var reports = reportRepository.findByReporterIdOrderByCreatedAtDesc(user.getId());

    assertThat(reports).hasSize(1);
    Report saved = reports.get(0);
    assertThat(saved.getAnimalType()).isEqualTo("Elephant");
    assertThat(saved.getIncidentType()).isEqualTo("Crop Damage");
    assertThat(saved.getLocation()).isEqualTo("Narok East");
    assertThat(saved.getDescription()).isEqualTo("Frontend submitted crop damage report.");
    assertThat(saved.getEstimatedLoss()).isEqualByComparingTo(new BigDecimal("1200"));
    assertThat(saved.getPaymentMode()).isEqualTo(PaymentMode.MPESA);
    assertThat(saved.getStatus()).isEqualTo(ReportStatus.PENDING);
    assertThat(saved.getEvidenceName()).isEqualTo("field-photo.jpg");
    assertThat(saved.getEvidenceData()).isEqualTo("data:image/jpeg;base64,abc123");
  }
}
