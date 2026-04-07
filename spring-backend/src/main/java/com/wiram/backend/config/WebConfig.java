package com.wiram.backend.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

  @Value("${CORS_ORIGIN:*}")
  private String corsOrigin;

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/**")
        .allowedOrigins(resolveOrigins())
        .allowedMethods("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .allowCredentials(false);
  }

  private String[] resolveOrigins() {
    if (corsOrigin == null || corsOrigin.isBlank() || "*".equals(corsOrigin.trim())) {
      return new String[] {"*"};
    }

    String[] raw = corsOrigin.split(",");
    List<String> origins = new ArrayList<>();
    for (String origin : raw) {
      String trimmed = origin.trim();
      if (!trimmed.isEmpty()) {
        origins.add(trimmed);
      }
    }

    return origins.isEmpty() ? new String[] {"*"} : origins.toArray(new String[0]);
  }
}
