const express = require("express");
const { asyncHandler, HttpError } = require("../utils/http");
const { serializeReport } = require("../utils/serializers");
const { createAuthMiddleware, requireRole } = require("../middleware/auth");

const VALID_STATUSES = ["pending", "verified", "rejected", "paid"];

function createReportsRoutes({ pool, config }) {
  const router = express.Router();
  const authenticate = createAuthMiddleware(pool, config);

  router.get(
    "/",
    authenticate,
    asyncHandler(async function (req, res) {
      const filters = [];
      const values = [];
      let index = 1;

      if (req.user.role === "member") {
        filters.push(`r.reporter_id = $${index}`);
        values.push(req.user.id);
        index += 1;
      } else if (req.query.reporterId) {
        filters.push(`r.reporter_id = $${index}`);
        values.push(String(req.query.reporterId));
        index += 1;
      }

      if (req.query.status && req.query.status !== "all") {
        const status = String(req.query.status).toLowerCase();
        if (VALID_STATUSES.indexOf(status) === -1) {
          throw new HttpError(400, "Invalid status filter.");
        }
        filters.push(`r.status = $${index}`);
        values.push(status);
        index += 1;
      }

      let limitClause = "";
      if (req.query.limit) {
        const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 20));
        limitClause = `LIMIT $${index}`;
        values.push(limit);
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
        ${limitClause}
      `;

      const result = await pool.query(query, values);

      res.json({
        reports: result.rows.map(serializeReport)
      });
    })
  );

  router.get(
    "/:id",
    authenticate,
    asyncHandler(async function (req, res) {
      const result = await pool.query(
        `
          SELECT
            r.*,
            reporter.name AS reporter_name,
            reviewer.name AS reviewed_by_name
          FROM reports r
          LEFT JOIN users reporter ON reporter.id = r.reporter_id
          LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
          WHERE r.id = $1
        `,
        [req.params.id]
      );

      const report = result.rows[0];
      if (!report) {
        throw new HttpError(404, "Report not found.");
      }

      if (req.user.role === "member" && report.reporter_id !== req.user.id) {
        throw new HttpError(403, "You can only view your own reports.");
      }

      res.json({ report: serializeReport(report) });
    })
  );

  router.get(
    "/:id/history",
    authenticate,
    asyncHandler(async function (req, res) {
      const reportResult = await pool.query("SELECT id, reporter_id FROM reports WHERE id = $1", [
        req.params.id
      ]);

      const report = reportResult.rows[0];
      if (!report) {
        throw new HttpError(404, "Report not found.");
      }

      if (req.user.role === "member" && report.reporter_id !== req.user.id) {
        throw new HttpError(403, "You can only view your own reports.");
      }

      const history = await pool.query(
        `
          SELECT id, report_id, status, notes, changed_by, changed_by_name, changed_at
          FROM report_status_history
          WHERE report_id = $1
          ORDER BY changed_at DESC
        `,
        [req.params.id]
      );

      res.json({ history: history.rows });
    })
  );

  router.post(
    "/",
    authenticate,
    asyncHandler(async function (req, res) {
      const animalType = String(req.body.animalType || "").trim();
      const incidentType = String(req.body.incidentType || "").trim();
      const location = String(req.body.location || "").trim();
      const description = String(req.body.description || "").trim();
      const estimatedLoss = Number(req.body.estimatedLoss || 0);
      const evidenceName = String(req.body.evidenceName || "").trim() || null;
      const evidenceData = String(req.body.evidenceData || "").trim() || null;

      if (!animalType || !incidentType || !location || !description) {
        throw new HttpError(400, "Please complete all required incident fields.");
      }

      if (!Number.isFinite(estimatedLoss) || estimatedLoss <= 0) {
        throw new HttpError(400, "Estimated loss must be greater than zero.");
      }

      const result = await pool.query(
        `
          INSERT INTO reports (
            reporter_id,
            animal_type,
            incident_type,
            location,
            description,
            estimated_loss,
            evidence_name,
            evidence_data,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
          RETURNING *
        `,
        [
          req.user.id,
          animalType,
          incidentType,
          location,
          description,
          estimatedLoss,
          evidenceName,
          evidenceData
        ]
      );

      const reportId = result.rows[0].id;
      await pool.query(
        `
          INSERT INTO report_status_history (
            report_id,
            status,
            notes,
            changed_by,
            changed_by_name
          )
          VALUES ($1, 'pending', $2, $3, $4)
        `,
        [reportId, "New incident submitted", req.user.id, req.user.name]
      );

      const fullReport = await pool.query(
        `
          SELECT
            r.*,
            reporter.name AS reporter_name,
            reviewer.name AS reviewed_by_name
          FROM reports r
          LEFT JOIN users reporter ON reporter.id = r.reporter_id
          LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
          WHERE r.id = $1
        `,
        [reportId]
      );

      res.status(201).json({
        message: "Incident report submitted successfully.",
        report: serializeReport(fullReport.rows[0])
      });
    })
  );

  router.patch(
    "/:id/status",
    authenticate,
    requireRole("officer", "admin"),
    asyncHandler(async function (req, res) {
      const status = String(req.body.status || "").trim().toLowerCase();
      const notes = String(req.body.notes || "").trim() || null;

      if (VALID_STATUSES.indexOf(status) === -1) {
        throw new HttpError(400, "Invalid status value.");
      }

      if (req.user.role === "officer" && ["verified", "rejected"].indexOf(status) === -1) {
        throw new HttpError(403, "Officers can only verify or reject incidents.");
      }

      const reportResult = await pool.query("SELECT * FROM reports WHERE id = $1", [
        req.params.id
      ]);

      const report = reportResult.rows[0];
      if (!report) {
        throw new HttpError(404, "Report not found.");
      }

      const updated = await pool.query(
        `
          UPDATE reports
          SET
            status = $2,
            reviewed_by = $3,
            reviewed_by_name = $4,
            reviewed_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [req.params.id, status, req.user.id, req.user.name]
      );

      await pool.query(
        `
          INSERT INTO report_status_history (
            report_id,
            status,
            notes,
            changed_by,
            changed_by_name
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [req.params.id, status, notes, req.user.id, req.user.name]
      );

      const fullReport = await pool.query(
        `
          SELECT
            r.*,
            reporter.name AS reporter_name,
            reviewer.name AS reviewed_by_name
          FROM reports r
          LEFT JOIN users reporter ON reporter.id = r.reporter_id
          LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
          WHERE r.id = $1
        `,
        [req.params.id]
      );

      res.json({
        message: "Report status updated successfully.",
        report: serializeReport(fullReport.rows[0]),
        status: updated.rows[0].status
      });
    })
  );

  return router;
}

module.exports = {
  createReportsRoutes: createReportsRoutes
};
