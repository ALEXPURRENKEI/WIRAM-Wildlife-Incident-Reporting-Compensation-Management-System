package com.wiram.backend.config;

import java.net.URI;
import java.util.Objects;

public final class DatabaseUrlNormalizer {

  private DatabaseUrlNormalizer() {}

  public static DatabaseConnection toConnection(String rawUrl) {
    String url = Objects.requireNonNull(rawUrl, "rawUrl").trim();

    if (url.startsWith("jdbc:")) {
      url = url.substring("jdbc:".length());
    }

    if (url.startsWith("postgres://")) {
      url = "postgresql://" + url.substring("postgres://".length());
    }

    if (!url.startsWith("postgresql://")) {
      url = "postgresql://" + url;
    }

    URI uri = URI.create(url);
    String jdbcUrl = buildJdbcUrl(uri);
    String userInfo = uri.getUserInfo();
    String username = null;
    String password = null;

    if (userInfo != null && !userInfo.isBlank()) {
      int separator = userInfo.indexOf(':');
      if (separator >= 0) {
        username = userInfo.substring(0, separator);
        password = userInfo.substring(separator + 1);
      } else {
        username = userInfo;
      }
    }

    return new DatabaseConnection(jdbcUrl, username, password);
  }

  public static String toJdbcUrl(String rawUrl) {
    return toConnection(rawUrl).jdbcUrl();
  }

  private static String buildJdbcUrl(URI uri) {
    StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://");

    if (uri.getHost() != null && !uri.getHost().isBlank()) {
      jdbcUrl.append(uri.getHost());
    } else if (uri.getRawAuthority() != null && !uri.getRawAuthority().isBlank()) {
      String authority = uri.getRawAuthority();
      int atIndex = authority.lastIndexOf('@');
      jdbcUrl.append(atIndex >= 0 ? authority.substring(atIndex + 1) : authority);
    }

    if (uri.getPort() > 0) {
      jdbcUrl.append(":").append(uri.getPort());
    }

    if (uri.getRawPath() != null && !uri.getRawPath().isBlank()) {
      jdbcUrl.append(uri.getRawPath());
    }

    if (uri.getRawQuery() != null && !uri.getRawQuery().isBlank()) {
      jdbcUrl.append("?").append(uri.getRawQuery().replace("channel_binding=", "channelBinding="));
    }

    return jdbcUrl.toString();
  }

  public record DatabaseConnection(String jdbcUrl, String username, String password) {}
}
