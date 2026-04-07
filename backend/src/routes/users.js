const express = require("express");
const { asyncHandler, HttpError } = require("../utils/http");
const { serializeUser } = require("../utils/serializers");
const { createAuthMiddleware, requireRole } = require("../middleware/auth");

const ALLOWED_ROLES = ["member", "officer", "admin"];

function createUsersRoutes({ pool, config }) {
  const router = express.Router();
  const authenticate = createAuthMiddleware(pool, config);

  router.get(
    "/",
    authenticate,
    requireRole("admin"),
    asyncHandler(async function (req, res) {
      const filters = [];
      const values = [];

      if (req.query.role && req.query.role !== "all") {
        const role = String(req.query.role);
        if (ALLOWED_ROLES.indexOf(role) === -1) {
          throw new HttpError(400, "Invalid role filter.");
        }
        filters.push(`role = $${values.length + 1}`);
        values.push(role);
      }

      const query =
        `
          SELECT id, name, email, role, created_at, updated_at
          FROM users
        ` +
        (filters.length ? ` WHERE ${filters.join(" AND ")}` : "") +
        ` ORDER BY created_at DESC`;

      const result = await pool.query(query, values);

      res.json({
        users: result.rows.map(serializeUser)
      });
    })
  );

  router.patch(
    "/:id/role",
    authenticate,
    requireRole("admin"),
    asyncHandler(async function (req, res) {
      const role = String(req.body.role || "").trim().toLowerCase();

      if (ALLOWED_ROLES.indexOf(role) === -1) {
        throw new HttpError(400, "Please choose a valid role.");
      }

      const result = await pool.query(
        `
          UPDATE users
          SET role = $2
          WHERE id = $1
          RETURNING id, name, email, role, created_at, updated_at
        `,
        [req.params.id, role]
      );

      const user = result.rows[0];
      if (!user) {
        throw new HttpError(404, "User not found.");
      }

      res.json({
        message: "User role updated successfully.",
        user: serializeUser(user)
      });
    })
  );

  return router;
}

module.exports = {
  createUsersRoutes: createUsersRoutes
};
