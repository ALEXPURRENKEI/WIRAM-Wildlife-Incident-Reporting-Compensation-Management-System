package com.wiram.backend.config;

public final class DatabaseUrlNormalizer {

  private DatabaseUrlNormalizer() {}

  public static String toJdbcUrl(String rawUrl) {
    String url = rawUrl.trim();

    if (url.startsWith("jdbc:")) {
      return url.replace("channel_binding=", "channelBinding=");
    }

    if (url.startsWith("postgresql://")) {
      url = "jdbc:" + url;
    } else if (url.startsWith("postgres://")) {
      url = "jdbc:postgresql://" + url.substring("postgres://".length());
    } else {
      url = "jdbc:postgresql://" + url;
    }

    return url.replace("channel_binding=", "channelBinding=");
  }
}
