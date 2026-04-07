const { Pool } = require("pg");

function shouldUseSsl(databaseUrl) {
  if (process.env.DATABASE_SSL === "false") {
    return false;
  }

  if (!databaseUrl) {
    return true;
  }

  return !/localhost|127\.0\.0\.1|::1/.test(databaseUrl);
}

function createPool(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  return new Pool({
    connectionString: databaseUrl,
    ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });
}

async function initializeSchema(pool) {
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('member', 'officer', 'admin')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      animal_type TEXT NOT NULL,
      incident_type TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      estimated_loss NUMERIC(12, 2) NOT NULL DEFAULT 0,
      evidence_name TEXT,
      evidence_data TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'verified', 'rejected', 'paid')),
      reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_by_name TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS report_status_history (
      id BIGSERIAL PRIMARY KEY,
      report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'rejected', 'paid')),
      notes TEXT,
      changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      changed_by_name TEXT,
      changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'users_set_updated_at'
      ) THEN
        CREATE TRIGGER users_set_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'reports_set_updated_at'
      ) THEN
        CREATE TRIGGER reports_set_updated_at
        BEFORE UPDATE ON reports
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);`);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_history_report ON report_status_history(report_id, changed_at DESC);`
  );
}

module.exports = {
  createPool: createPool,
  initializeSchema: initializeSchema
};
