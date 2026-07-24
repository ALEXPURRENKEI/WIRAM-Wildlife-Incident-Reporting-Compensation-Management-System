package com.wiram.backend.config;

import com.wiram.backend.config.DatabaseUrlNormalizer.DatabaseConnection;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DatabaseConfig {

  private static final Logger logger = LoggerFactory.getLogger(DatabaseConfig.class);

  @Bean
  public DataSource dataSource(
      @Value("${DATABASE_URL:}") String databaseUrl,
      @Value("${SPRING_DATASOURCE_URL:}") String springDatasourceUrl,
      @Value("${SPRING_DATASOURCE_USERNAME:}") String springDatasourceUsername,
      @Value("${SPRING_DATASOURCE_PASSWORD:}") String springDatasourcePassword) {
    String resolvedUrl =
        firstNonBlank(databaseUrl, springDatasourceUrl);

    if (resolvedUrl == null || resolvedUrl.isBlank()) {
      logger.warn("DATABASE_URL is not set. Falling back to local file-based H2 so the service can boot.");
      return fallbackDataSource();
    }

    try {
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
    } catch (RuntimeException ex) {
      logger.warn(
          "PostgreSQL datasource could not start. Falling back to local file-based H2 so the service stays up.",
          ex);
      return fallbackDataSource();
    }
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

  private DataSource fallbackDataSource() {
    HikariConfig config = new HikariConfig();
    String jdbcUrl = buildPersistentFallbackJdbcUrl();
    config.setJdbcUrl(jdbcUrl);
    config.setUsername("sa");
    config.setPassword("");
    config.setMaximumPoolSize(5);
    config.setMinimumIdle(1);
    config.setPoolName("wiram-h2-pool");
    return new HikariDataSource(config);
  }

  private String buildPersistentFallbackJdbcUrl() {
    try {
      Path dataDir = Paths.get("data");
      Files.createDirectories(dataDir);
      String dbPath = dataDir.resolve("wiram").toAbsolutePath().toString().replace('\\', '/');
      return "jdbc:h2:file:" + dbPath + ";MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE";
    } catch (IOException ex) {
      logger.warn("Unable to create the local H2 data directory; falling back to an in-memory database.", ex);
      return "jdbc:h2:mem:wiram;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE";
    }
  }
}

