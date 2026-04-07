const express = require("express");
const cors = require("cors");
const { HttpError } = require("./utils/http");
const { errorHandler } = require("./middleware/error");
const { createAuthRoutes } = require("./routes/auth");
const { createReportsRoutes } = require("./routes/reports");
const { createUsersRoutes } = require("./routes/users");
const { createDashboardRoutes } = require("./routes/dashboard");

function createCorsOptions(corsOrigin) {
  if (corsOrigin === "*") {
    return { origin: true };
  }

  return {
    origin: corsOrigin,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  };
}

function createApp({ pool, config }) {
  const app = express();

  app.set("trust proxy", 1);
  app.use(cors(createCorsOptions(config.corsOrigin)));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.get("/", function (req, res) {
    res.json({
      name: "WIRAM API",
      status: "ok",
      version: "1.0.0"
    });
  });

  app.get("/api/health", function (req, res) {
    res.json({
      status: "ok",
      service: "wiram-backend"
    });
  });

  app.use("/api/auth", createAuthRoutes({ pool, config }));
  app.use("/api/reports", createReportsRoutes({ pool, config }));
  app.use("/api/users", createUsersRoutes({ pool, config }));
  app.use("/api/dashboard", createDashboardRoutes({ pool, config }));

  app.use(function (req, res, next) {
    next(new HttpError(404, "Route not found."));
  });

  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp: createApp
};
