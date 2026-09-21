/** Company recruitment team RBAC — LASYA V2 Prompt 5 */

const COMPANY_ROLES = [
  'recruitment_admin',
  'hiring_manager',
  'recruiter',
  'interviewer',
  'hr_executive',
  'read_only',
]

const COMPANY_PERMISSIONS = [
  'profile.manage',
  'jobs.manage',
  'applications.read',
  'applications.manage',
  'interviews.manage',
  'offers.manage',
  'offers.approve',
  'team.manage',
  'panels.manage',
  'communications.send',
  'talent.discover',
  'analytics.read',
  'reports.read',
  'reports.generate',
]

const ROLE_PERMISSIONS = {
  recruitment_admin: COMPANY_PERMISSIONS,
  hiring_manager: [
    'applications.read',
    'applications.manage',
    'interviews.manage',
    'offers.manage',
    'offers.approve',
    'panels.manage',
    'communications.send',
    'talent.discover',
    'analytics.read',
    'reports.read',
  ],
  recruiter: [
    'applications.read',
    'applications.manage',
    'interviews.manage',
    'offers.manage',
    'panels.manage',
    'communications.send',
    'talent.discover',
    'analytics.read',
    'reports.read',
  ],
  interviewer: ['applications.read', 'interviews.manage'],
  hr_executive: [
    'applications.read',
    'applications.manage',
    'offers.manage',
    'communications.send',
    'analytics.read',
    'reports.read',
  ],
  read_only: ['applications.read', 'analytics.read', 'reports.read', 'talent.discover'],
}

const RECRUITMENT_NOTIFICATION_TYPES = [
  'recruitment_application_received',
  'recruitment_interview_scheduled',
  'recruitment_interview_rescheduled',
  'recruitment_interview_cancelled',
  'recruitment_candidate_shortlisted',
  'recruitment_offer_released',
  'recruitment_offer_accepted',
  'recruitment_joining_confirmed',
  'recruitment_bulk_announcement',
]

function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.read_only
}

function hasPermission(role, permission) {
  return permissionsForRole(role).includes(permission)
}

module.exports = {
  COMPANY_ROLES,
  COMPANY_PERMISSIONS,
  ROLE_PERMISSIONS,
  RECRUITMENT_NOTIFICATION_TYPES,
  permissionsForRole,
  hasPermission,
}
