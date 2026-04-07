package com.wiram.backend.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DatabaseConfig {

  @Bean
  public DataSource dataSource(@Value("${DATABASE_URL:}") String databaseUrl) {
    if (databaseUrl == null || databaseUrl.isBlank()) {
      throw new IllegalStateException("DATABASE_URL is required.");
    }

    HikariConfig config = new HikariConfig();
    config.setJdbcUrl(DatabaseUrlNormalizer.toJdbcUrl(databaseUrl));
    config.setMaximumPoolSize(10);
    config.setMinimumIdle(2);
    config.setPoolName("wiram-pool");
    return new HikariDataSource(config);
  }
}
