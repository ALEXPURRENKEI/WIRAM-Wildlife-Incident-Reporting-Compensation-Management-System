package com.wiram.backend;

import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class WiramBackendApplication {

  public static void main(String[] args) {
    Map<String, Object> defaults = new HashMap<>();
    defaults.put("server.port", resolvePort());
    SpringApplication application = new SpringApplication(WiramBackendApplication.class);
    application.setDefaultProperties(defaults);
    application.run(args);
  }

  private static String resolvePort() {
    String port = System.getenv("PORT");
    if (port == null || port.isBlank()) {
      port = System.getenv("SERVER_PORT");
    }

    return (port == null || port.isBlank()) ? "8080" : port.trim();
  }
}
