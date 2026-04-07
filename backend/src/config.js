const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

function parseCorsOrigins(value) {
  if (!value || value === "*") {
    return "*";
  }

  const origins = value
    .split(",")
    .map(function (item) {
      return item.trim();
    })
    .filter(Boolean);

  return origins.length > 0 ? origins : "*";
}

const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "wiram-dev-secret-change-me",
  corsOrigin: parseCorsOrigins(process.env.CORS_ORIGIN || "*"),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 10),
  databaseSsl: process.env.DATABASE_SSL !== "false"
};

module.exports = { config };
