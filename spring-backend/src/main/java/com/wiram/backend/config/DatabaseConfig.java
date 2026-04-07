package com.wiram.backend.config;

import com.wiram.backend.config.DatabaseUrlNormalizer.DatabaseConnection;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DatabaseConfig {

  @Bean
  public DataSource dataSource(
      @Value("${DATABASE_URL:}") String databaseUrl,
      @Value("${SPRING_DATASOURCE_URL:}") String springDatasourceUrl,
      @Value("${SPRING_DATASOURCE_USERNAME:}") String springDatasourceUsername,
      @Value("${SPRING_DATASOURCE_PASSWORD:}") String springDatasourcePassword) {
    String resolvedUrl =
        firstNonBlank(databaseUrl, springDatasourceUrl);

    if (resolvedUrl == null || resolvedUrl.isBlank()) {
      throw new IllegalStateException(
          "DATABASE_URL or SPRING_DATASOURCE_URL is required for PostgreSQL connectivity.");
    }

    DatabaseConnection connection = DatabaseUrlNormalizer.toConnection(resolvedUrl);
    HikariConfig config = new HikariConfig();
    config.setJdbcUrl(connection.jdbcUrl());
    String username = firstNonBlank(springDatasourceUsername, connection.username());
    String password = firstNonBlank(springDatasourcePassword, connection.password());

    if (username != null && !username.isBlank()) {
      config.setUsername(username);
    }

    if (password != null && !password.isBlank()) {
      config.setPassword(password);
    }

    config.setMaximumPoolSize(10);
    config.setMinimumIdle(2);
    config.setPoolName("wiram-pool");
    return new HikariDataSource(config);
  }

  private String firstNonBlank(String first, String second) {
    if (first != null && !first.isBlank()) {
      return first.trim();
    }

    if (second != null && !second.isBlank()) {
      return second.trim();
    }

    return null;
  }
}
