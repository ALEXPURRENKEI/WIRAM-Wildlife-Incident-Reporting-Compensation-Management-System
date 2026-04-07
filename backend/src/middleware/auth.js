const jwt = require("jsonwebtoken");
const { HttpError } = require("../utils/http");
const { serializeUser } = require("../utils/serializers");

function createAuthMiddleware(pool, config) {
  return async function authenticate(req, res, next) {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      next(new HttpError(401, "Authentication required."));
      return;
    }

    const token = header.slice(7).trim();
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      const result = await pool.query(
        `
          SELECT id, name, email, role, created_at, updated_at
          FROM users
          WHERE id = $1
        `,
        [payload.sub]
      );

      const user = result.rows[0];
      if (!user) {
        next(new HttpError(401, "User account no longer exists."));
        return;
      }

      req.user = serializeUser(user);
      req.token = token;
      next();
    } catch (_error) {
      next(new HttpError(401, "Invalid or expired token."));
    }
  };
}

function requireRole() {
  const roles = Array.prototype.slice.call(arguments);

  return function authorize(req, res, next) {
    if (!req.user) {
      next(new HttpError(401, "Authentication required."));
      return;
    }

    if (roles.length > 0 && roles.indexOf(req.user.role) === -1) {
      next(new HttpError(403, "You do not have permission to access this resource."));
      return;
    }

    next();
  };
}

module.exports = {
  createAuthMiddleware: createAuthMiddleware,
  requireRole: requireRole
};
