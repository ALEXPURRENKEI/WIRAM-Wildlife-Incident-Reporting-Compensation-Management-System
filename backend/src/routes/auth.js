const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { asyncHandler, HttpError } = require("../utils/http");
const { serializeUser } = require("../utils/serializers");
const { createAuthMiddleware } = require("../middleware/auth");

const ALLOWED_ROLES = ["member", "officer", "admin"];

function createToken(user, config) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name
    },
    config.jwtSecret,
    { expiresIn: "7d" }
  );
}

function createAuthRoutes({ pool, config }) {
  const router = express.Router();
  const authenticate = createAuthMiddleware(pool, config);

  router.post(
    "/register",
    asyncHandler(async function (req, res) {
      const name = String(req.body.name || "").trim();
      const email = String(req.body.email || "").trim().toLowerCase();
      const password = String(req.body.password || "");
      const role = String(req.body.role || "member").trim().toLowerCase();

      if (name.length < 2) {
        throw new HttpError(400, "Please provide your full name.");
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new HttpError(400, "Please provide a valid email address.");
      }

      if (password.length < 6) {
        throw new HttpError(400, "Password must have at least 6 characters.");
      }

      if (ALLOWED_ROLES.indexOf(role) === -1) {
        throw new HttpError(400, "Please choose a valid role.");
      }

      const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
      if (existing.rowCount > 0) {
        throw new HttpError(409, "That email is already registered.");
      }

      const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
      const result = await pool.query(
        `
          INSERT INTO users (name, email, password_hash, role)
          VALUES ($1, $2, $3, $4)
          RETURNING id, name, email, role, created_at, updated_at
        `,
        [name, email, passwordHash, role]
      );

      const user = serializeUser(result.rows[0]);
      const token = createToken(user, config);

      res.status(201).json({
        message: "Registration successful.",
        token: token,
        user: user
      });
    })
  );

  router.post(
    "/login",
    asyncHandler(async function (req, res) {
      const email = String(req.body.email || "").trim().toLowerCase();
      const password = String(req.body.password || "");

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new HttpError(400, "Please provide a valid email address.");
      }

      if (!password) {
        throw new HttpError(400, "Password is required.");
      }

      const result = await pool.query(
        `
          SELECT id, name, email, role, password_hash, created_at, updated_at
          FROM users
          WHERE email = $1
        `,
        [email]
      );

      const account = result.rows[0];
      if (!account) {
        throw new HttpError(401, "Invalid email or password.");
      }

      const matches = await bcrypt.compare(password, account.password_hash);
      if (!matches) {
        throw new HttpError(401, "Invalid email or password.");
      }

      const user = serializeUser(account);
      const token = createToken(user, config);

      res.json({
        message: "Login successful.",
        token: token,
        user: user
      });
    })
  );

  router.get(
    "/me",
    authenticate,
    asyncHandler(async function (req, res) {
      res.json({ user: req.user });
    })
  );

  return router;
}

module.exports = {
  createAuthRoutes: createAuthRoutes
};
