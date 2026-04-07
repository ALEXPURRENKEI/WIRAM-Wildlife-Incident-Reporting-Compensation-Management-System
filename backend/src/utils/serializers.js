function serializeUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function serializeReport(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    reporterId: row.reporter_id,
    reporterName: row.reporter_name,
    animalType: row.animal_type,
    incidentType: row.incident_type,
    location: row.location,
    description: row.description,
    estimatedLoss: Number(row.estimated_loss),
    evidenceName: row.evidence_name,
    evidenceData: row.evidence_data,
    status: row.status,
    reviewedById: row.reviewed_by,
    reviewedBy: row.reviewed_by_name,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  serializeUser: serializeUser,
  serializeReport: serializeReport
};
