/**
 * Institution student DTOs — audit, export, and dashboard shapes.
 * Directory/detail serializers live in institutionStudentService.js
 */

const ACTION_LABELS = {
  student_created: 'Student Added',
  student_updated: 'Student Updated',
  placement_status_changed: 'Placement Changed',
  achievement_verified: 'Achievement Verified',
  certificate_verified: 'Certificate Verified',
  skill_verified: 'Skill Verified',
  cohort_assigned: 'Cohort Assigned',
  bulk_placement_update: 'Bulk Placement Update',
  bulk_status_update: 'Bulk Status Update',
  bulk_export: 'Bulk Export',
  import_confirmed: 'Bulk Import',
  note_added: 'Note Added',
  report_generated: 'Report Generated',
  tags_updated: 'Tags Updated',
  role_changed: 'Role Changed',
}

function serializeAuditEntry(entry) {
  return {
    id: entry._id.toString(),
    action: entry.action,
    type: ACTION_LABELS[entry.action] || entry.action,
    title: entry.description || ACTION_LABELS[entry.action] || entry.action,
    detail: entry.actorName
      ? `${entry.actorName} · ${new Date(entry.createdAt).toLocaleString()}`
      : new Date(entry.createdAt).toLocaleString(),
    studentId: entry.studentId ? entry.studentId.toString() : null,
    actorName: entry.actorName,
    createdAt: entry.createdAt,
    metadata: entry.metadata || {},
  }
}

function serializeExportMeta({ type, format, filename, rowCount }) {
  return {
    type,
    format,
    filename,
    rowCount,
    generatedAt: new Date().toISOString(),
  }
}

function serializeDashboardStats(stats) {
  return {
    totalStudents: stats.total,
    activeStudents: stats.active,
    placementEligible: stats.placementEligible,
    placedStudents: stats.placedStudents,
    pendingVerifications: stats.pendingVerifications,
    departments: stats.departments,
    recentlyAdded: stats.recentlyAdded || [],
    recentActivity: stats.recentActivity || [],
  }
}

module.exports = {
  serializeAuditEntry,
  serializeExportMeta,
  serializeDashboardStats,
  ACTION_LABELS,
}
