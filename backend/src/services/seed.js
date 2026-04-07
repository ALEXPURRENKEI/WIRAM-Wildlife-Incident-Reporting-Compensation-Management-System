const bcrypt = require("bcryptjs");

const DEMO_USERS = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Miriam Njeri",
    email: "member@wiram.org",
    password: "password123",
    role: "member"
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Daniel Mwangi",
    email: "community@wiram.org",
    password: "password123",
    role: "member"
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Officer Grace Otieno",
    email: "officer@wiram.org",
    password: "password123",
    role: "officer"
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    name: "Admin Peter Kamau",
    email: "admin@wiram.org",
    password: "password123",
    role: "admin"
  }
];

const DEMO_REPORTS = [
  {
    id: "55555555-5555-5555-5555-555555555555",
    reporterEmail: "member@wiram.org",
    animalType: "Elephant",
    incidentType: "Crop Damage",
    location: "Narok East",
    description: "A herd of elephants destroyed maize on two acres overnight.",
    estimatedLoss: 1400,
    status: "pending",
    createdAt: "2026-03-20T07:20:00.000Z"
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    reporterEmail: "community@wiram.org",
    animalType: "Lion",
    incidentType: "Livestock Attack",
    location: "Kajiado North",
    description: "Two goats were killed near the grazing enclosure.",
    estimatedLoss: 500,
    status: "verified",
    reviewedByEmail: "officer@wiram.org",
    createdAt: "2026-03-18T14:10:00.000Z",
    reviewedAt: "2026-03-19T08:30:00.000Z"
  },
  {
    id: "77777777-7777-7777-7777-777777777777",
    reporterEmail: "member@wiram.org",
    animalType: "Buffalo",
    incidentType: "Property Damage",
    location: "Laikipia West",
    description: "Fence and water tank were damaged by buffalo crossing.",
    estimatedLoss: 850,
    status: "rejected",
    reviewedByEmail: "officer@wiram.org",
    createdAt: "2026-03-16T10:12:00.000Z",
    reviewedAt: "2026-03-17T11:40:00.000Z"
  },
  {
    id: "88888888-8888-8888-8888-888888888888",
    reporterEmail: "community@wiram.org",
    animalType: "Hyena",
    incidentType: "Livestock Attack",
    location: "Baringo South",
    description: "Three sheep missing after a nighttime hyena raid.",
    estimatedLoss: 620,
    status: "paid",
    reviewedByEmail: "admin@wiram.org",
    createdAt: "2026-03-13T06:45:00.000Z",
    reviewedAt: "2026-03-23T10:00:00.000Z"
  },
  {
    id: "99999999-9999-9999-9999-999999999999",
    reporterEmail: "member@wiram.org",
    animalType: "Leopard",
    incidentType: "Human Injury",
    location: "Isiolo Central",
    description: "Farmer sustained arm injuries while guarding livestock.",
    estimatedLoss: 1100,
    status: "pending",
    createdAt: "2026-03-24T19:05:00.000Z"
  }
];

async function getUserByEmail(pool, email) {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0] || null;
}

async function ensureUser(pool, config, user) {
  const existing = await getUserByEmail(pool, user.email);
  if (existing) {
    return existing;
  }

  const passwordHash = await bcrypt.hash(user.password, config.bcryptRounds);
  const result = await pool.query(
    `
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `,
    [user.id, user.name, user.email.toLowerCase(), passwordHash, user.role]
  );

  return result.rows[0];
}

async function ensureReport(pool, report, userMap) {
  const existing = await pool.query("SELECT id FROM reports WHERE id = $1", [report.id]);
  if (existing.rowCount > 0) {
    return existing.rows[0];
  }

  const reporter = userMap.get(report.reporterEmail);
  const reviewer =
    report.reviewedByEmail && userMap.has(report.reviewedByEmail)
      ? userMap.get(report.reviewedByEmail)
      : null;

  await pool.query(
    `
      INSERT INTO reports (
        id,
        reporter_id,
        animal_type,
        incident_type,
        location,
        description,
        estimated_loss,
        evidence_name,
        evidence_data,
        status,
        reviewed_by,
        reviewed_by_name,
        reviewed_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);
    `,
    [
      report.id,
      reporter.id,
      report.animalType,
      report.incidentType,
      report.location,
      report.description,
      report.estimatedLoss,
      null,
      null,
      report.status,
      reviewer ? reviewer.id : null,
      reviewer ? reviewer.name : null,
      report.reviewedAt ? new Date(report.reviewedAt) : null,
      report.createdAt ? new Date(report.createdAt) : new Date(),
      report.createdAt ? new Date(report.createdAt) : new Date()
    ]
  );

  await pool.query(
    `
      INSERT INTO report_status_history (
        report_id,
        status,
        notes,
        changed_by,
        changed_by_name,
        changed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      report.id,
      report.status,
      "Seeded demo report",
      reviewer ? reviewer.id : reporter.id,
      reviewer ? reviewer.name : reporter.name,
      report.reviewedAt ? new Date(report.reviewedAt) : new Date(report.createdAt)
    ]
  );
}

async function seedDatabase(pool, config) {
  if (process.env.SEED_DEMO_DATA === "false") {
    return;
  }

  const userMap = new Map();

  for (const user of DEMO_USERS) {
    const seededUser = await ensureUser(pool, config, user);
    userMap.set(user.email, seededUser);
  }

  for (const report of DEMO_REPORTS) {
    await ensureReport(pool, report, userMap);
  }
}

module.exports = {
  seedDatabase: seedDatabase
};
