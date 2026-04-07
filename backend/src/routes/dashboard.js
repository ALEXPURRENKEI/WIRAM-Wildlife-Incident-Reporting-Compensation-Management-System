const express = require("express");
const { asyncHandler } = require("../utils/http");
const { serializeReport } = require("../utils/serializers");
const { createAuthMiddleware } = require("../middleware/auth");

function countByStatus(rows) {
  const counts = {
    total: rows.length,
    pending: 0,
    verified: 0,
    rejected: 0,
    paid: 0
  };

  rows.forEach(function (row) {
    if (counts[row.status] !== undefined) {
      counts[row.status] += 1;
    }
  });

  return counts;
}

function createDashboardRoutes({ pool, config }) {
  const router = express.Router();
  const authenticate = createAuthMiddleware(pool, config);

  router.get(
    "/summary",
    authenticate,
    asyncHandler(async function (req, res) {
      const filters = [];
      const values = [];
      let index = 1;

      if (req.user.role === "member") {
        filters.push(`r.reporter_id = $${index}`);
        values.push(req.user.id);
        index += 1;
      }

      const query = `
        SELECT
          r.*,
          reporter.name AS reporter_name,
          reviewer.name AS reviewed_by_name
        FROM reports r
        LEFT JOIN users reporter ON reporter.id = r.reporter_id
        LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
        ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
        ORDER BY r.created_at DESC
      `;

      const reportsResult = await pool.query(query, values);
      const reports = reportsResult.rows;
      const counts = countByStatus(reports);
      const payload = {
        role: req.user.role,
        counts: counts,
        recentReports: reports.slice(0, req.user.role === "member" ? 5 : 8).map(serializeReport)
      };

      if (req.user.role === "officer") {
        payload.pendingReports = reports
          .filter(function (report) {
            return report.status === "pending";
          })
          .slice(0, 8)
          .map(serializeReport);
      }

      if (req.user.role === "admin") {
        const userCount = await pool.query("SELECT COUNT(*)::int AS count FROM users");
        payload.userCount = userCount.rows[0].count;
      }

      res.json(payload);
    })
  );

  return router;
}

module.exports = {
  createDashboardRoutes: createDashboardRoutes
};
