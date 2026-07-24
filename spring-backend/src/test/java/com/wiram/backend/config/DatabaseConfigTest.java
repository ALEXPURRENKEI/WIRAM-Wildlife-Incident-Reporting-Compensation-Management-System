package com.wiram.backend.config;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class DatabaseConfigTest {

  @Test
  void fallbackDataSourceUsesPersistentFileBasedH2WhenNoDatabaseUrlIsProvided() {
    DatabaseConfig config = new DatabaseConfig();

    DataSource dataSource = config.dataSource("", "", "", "");

    assertTrue(dataSource instanceof HikariDataSource);
    HikariDataSource hikariDataSource = (HikariDataSource) dataSource;
    String jdbcUrl = hikariDataSource.getJdbcUrl();
    assertTrue(jdbcUrl.contains("jdbc:h2:file:"), "Expected file-based H2 JDBC URL, got: " + jdbcUrl);
    assertTrue(!jdbcUrl.contains("jdbc:h2:mem:"), "Expected persistent file-based H2 URL, got: " + jdbcUrl);
  }
}
