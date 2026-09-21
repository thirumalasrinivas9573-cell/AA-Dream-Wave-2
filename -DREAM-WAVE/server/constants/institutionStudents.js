/** Institution Student Intelligence — privacy-safe constants */

const STUDENT_STATUSES = ['active', 'inactive', 'graduated', 'suspended']

/** Legacy placement statuses (backward compatible) */
const PLACEMENT_STATUSES = [
  'not-started',
  'preparing',
  'placement-ready',
  'interviewing',
  'placed',
]

/** Canonical placement lifecycle */
const PLACEMENT_LIFECYCLE = [
  'NOT_ELIGIBLE',
  'ELIGIBLE',
  'PREPARING',
  'READY',
  'APPLYING',
  'PLACED',
  'HIGHER_STUDIES',
  'ENTREPRENEURSHIP',
  'OPTED_OUT',
]

const PLACEMENT_STATUS_SOURCES = ['institution', 'student', 'system']

const SCHOLARSHIP_STATUSES = ['none', 'applied', 'approved']

const PROFILE_STATUSES = ['complete', 'partial', 'pending']

const PROJECT_VISIBILITY = ['shared', 'public', 'academic', 'institution-managed', 'private']

const PROJECT_STATUSES = ['completed', 'in-progress', 'planned']

const VERIFICATION_STATUSES = ['verified', 'pending', 'unverified']

const CERTIFICATE_VERIFICATION = [
  'SELF_UPLOADED',
  'INSTITUTION_VERIFIED',
  'INSTITUTION_ISSUED',
  'EXTERNALLY_VERIFIED',
]

const CERTIFICATE_VISIBILITY = ['private', 'shared', 'public', 'institution']

const ACHIEVEMENT_TYPES = [
  'hackathon',
  'competition',
  'publication',
  'award',
  'academic-excellence',
  'sports',
  'cultural',
  'other',
]

const DOCUMENT_TYPES = [
  'resume',
  'placement_resume',
  'academic',
  'certificate',
  'institution_form',
  'other',
]

const DOCUMENT_VISIBILITY = ['private', 'shared', 'institution']

const IMPORT_MODES = ['CREATE_ONLY', 'UPDATE_EXISTING', 'CREATE_AND_UPDATE']

const COHORT_TYPES = ['static', 'dynamic']

const AUDIT_ACTIONS = [
  'student_created',
  'student_updated',
  'placement_status_changed',
  'achievement_verified',
  'certificate_verified',
  'skill_verified',
  'cohort_assigned',
  'bulk_placement_update',
  'bulk_status_update',
  'bulk_export',
  'import_confirmed',
  'note_added',
  'report_generated',
  'tags_updated',
  'role_changed',
]

const SORT_FIELDS = {
  studentId: 'studentId',
  rollNumber: 'rollNumber',
  fullName: 'fullName',
  department: 'department',
  course: 'course',
  semester: 'semester',
  status: 'status',
  updatedAt: 'updatedAt',
  createdAt: 'createdAt',
}

const DIRECTORY_FIELDS = [
  'studentId',
  'rollNumber',
  'fullName',
  'photoInitials',
  'department',
  'course',
  'batch',
  'semester',
  'section',
  'academicYear',
  'status',
  'placement.lifecycleStatus',
  'sharedSkills',
  'sharedProjects',
  'profileStatus',
  'email',
  'createdAt',
  'updatedAt',
]

/** Map legacy placement status → lifecycle */
const LEGACY_TO_LIFECYCLE = {
  'not-started': 'NOT_ELIGIBLE',
  preparing: 'PREPARING',
  'placement-ready': 'READY',
  interviewing: 'APPLYING',
  placed: 'PLACED',
}

module.exports = {
  STUDENT_STATUSES,
  PLACEMENT_STATUSES,
  PLACEMENT_LIFECYCLE,
  PLACEMENT_STATUS_SOURCES,
  SCHOLARSHIP_STATUSES,
  PROFILE_STATUSES,
  PROJECT_VISIBILITY,
  PROJECT_STATUSES,
  VERIFICATION_STATUSES,
  CERTIFICATE_VERIFICATION,
  CERTIFICATE_VISIBILITY,
  ACHIEVEMENT_TYPES,
  DOCUMENT_TYPES,
  DOCUMENT_VISIBILITY,
  IMPORT_MODES,
  COHORT_TYPES,
  AUDIT_ACTIONS,
  SORT_FIELDS,
  DIRECTORY_FIELDS,
  LEGACY_TO_LIFECYCLE,
}
