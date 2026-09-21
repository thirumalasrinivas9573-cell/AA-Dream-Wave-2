const mongoose = require('mongoose')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionStudentNote = require('../models/InstitutionStudentNote')
const { SORT_FIELDS, LEGACY_TO_LIFECYCLE } = require('../constants/institutionStudents')
const {
  isCertificateVisible,
  isDocumentVisible,
  isProjectVisible,
  isAchievementVisible,
  serializeVisibleCertificate,
  serializeAchievement,
} = require('../utils/institutionStudentPrivacy')
const { recordAudit } = require('./institutionAuditService')
const institutionCache = require('./institutionCache')
const { ERROR_CODES, apiError } = require('../utils/institutionApiErrors')
const { serializeAuditEntry } = require('../dtos/institutionStudentDtos')

const DIRECTORY_PROJECTION = {
  studentId: 1,
  rollNumber: 1,
  photoInitials: 1,
  fullName: 1,
  department: 1,
  course: 1,
  batch: 1,
  semester: 1,
  section: 1,
  academicYear: 1,
  status: 1,
  email: 1,
  'placement.status': 1,
  'placement.lifecycleStatus': 1,
  sharedSkills: 1,
  sharedProjects: 1,
  profileStatus: 1,
  createdAt: 1,
  updatedAt: 1,
}

function invalidateInstitutionCache(institutionId) {
  institutionCache.invalidateInstitution(String(institutionId))
}

function err(message, code = 400) {
  const e = new Error(message)
  e.statusCode = code
  return e
}

function sanitizeText(text, max = 5000) {
  if (text == null) return ''
  return String(text).trim().slice(0, max)
}

function initials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')
}

function serializeDirectory(doc) {
  const o = doc.toObject ? doc.toObject() : doc
  const projects = (o.sharedProjects || [])
    .filter(isProjectVisible)
    .slice(0, 3)
    .map((p) => p.title)
    .filter(Boolean)
  return {
    id: o._id.toString(),
    studentId: o.studentId,
    rollNumber: o.rollNumber,
    photoInitials: o.photoInitials || initials(o.fullName),
    fullName: o.fullName,
    department: o.department,
    course: o.course,
    batch: o.batch,
    semester: o.semester,
    section: o.section,
    academicYear: o.academicYear,
    status: o.status,
    email: o.email,
    placementStatus: o.placement?.lifecycleStatus || LEGACY_TO_LIFECYCLE[o.placement?.status] || 'NOT_ELIGIBLE',
    sharedSkills: o.sharedSkills || [],
    sharedProjectsSummary: projects,
    profileStatus: o.profileStatus,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}

function serializeDetail(doc, notes = []) {
  const o = doc.toObject ? doc.toObject() : doc
  return {
    id: o._id.toString(),
    rollNumber: o.rollNumber,
    photoInitials: o.photoInitials || initials(o.fullName),
    fullName: o.fullName,
    department: o.department,
    course: o.course,
    branch: o.branch || o.department,
    semester: o.semester,
    section: o.section,
    academicYear: o.academicYear,
    admissionYear: o.admissionYear,
    batch: o.batch,
    admissionDate: o.admissionDate,
    email: o.email,
    phone: o.phone,
    status: o.status,
    gender: o.gender,
    dateOfBirth: o.dateOfBirth,
    bloodGroup: o.bloodGroup,
    nationality: o.nationality,
    address: o.address,
    city: o.city,
    state: o.state,
    country: o.country,
    emergencyContact: o.emergencyContact,
    guardian: o.guardian || {},
    creditsEarned: o.creditsEarned ?? 0,
    currentSubjects: o.currentSubjects || [],
    cgpa: o.cgpa ?? 0,
    backlogs: o.backlogs ?? 0,
    expectedGraduation: o.expectedGraduation,
    academicAdvisor: o.academicAdvisor,
    attendance: o.attendance ?? 0,
    performance: o.performance || [],
    technicalSkills: [...(o.sharedSkills || []), ...(o.verifiedSkills || [])],
    sharedSkills: o.sharedSkills || [],
    verifiedSkills: o.verifiedSkills || [],
    softSkills: o.softSkills || [],
    programmingLanguages: o.programmingLanguages || [],
    languagesKnown: o.languagesKnown || [],
    projects: (o.sharedProjects || [])
      .filter(isProjectVisible)
      .map((p, i) => ({
      id: `proj-${i}`,
      title: p.title,
      role: p.role,
      technologies: p.technologies || [],
      status: p.status === 'completed' ? 'completed' : 'in-progress',
      description: p.description,
      repositoryUrl: p.repositoryUrl,
      demoUrl: p.demoUrl,
      visibility: p.visibility,
      teamMembers: p.teamMembers || [],
      verificationStatus: p.verificationStatus,
    })),
    internships: o.internships || [],
    certifications: (o.certifications || [])
      .filter(isCertificateVisible)
      .map(serializeVisibleCertificate),
    researchPapers: o.researchPapers || [],
    achievements: (o.achievements || [])
      .filter(isAchievementVisible)
      .map(serializeAchievement),
    documents: (o.documents || [])
      .filter(isDocumentVisible)
      .map((d, i) => ({
        id: `doc-${i}`,
        name: d.name,
        type: d.type,
        status: d.status,
        fileName: d.fileName,
        visibility: d.visibility,
        uploadedAt: d.uploadedAt,
      })),
    placement: {
      lifecycleStatus: o.placement?.lifecycleStatus || LEGACY_TO_LIFECYCLE[o.placement?.status] || 'NOT_ELIGIBLE',
      statusSource: o.placement?.statusSource || 'system',
      status: o.placement?.status || 'not-started',
      resumeUploaded: o.placement?.resumeUploaded ?? false,
      resumeScore: 0,
      internshipsCompleted: o.placement?.internshipsCompleted ?? 0,
      jobsApplied: o.placement?.jobsApplied ?? 0,
      interviewProgress: o.placement?.interviewProgress || '',
      offerStatus: o.placement?.offerStatus || '',
      readiness: 0,
      careerScore: 0,
      companyName: o.placement?.companyName || '',
      roleTitle: o.placement?.roleTitle || '',
    },
    placementSummary: {
      resumeUploaded: o.placement?.resumeUploaded ?? false,
      projectsShared: (o.sharedProjects || []).filter((p) => p.visibility !== 'private').length,
      certificatesShared: (o.certifications || []).filter(isCertificateVisible).length,
      sharedSkillsCount: (o.sharedSkills || []).length,
    },
    scholarshipStatus: o.scholarshipStatus || 'none',
    profileStatus: o.profileStatus || 'partial',
    notes: notes.map((n) => ({
      id: n._id.toString(),
      text: n.content,
      type: n.type || 'internal',
      author: n.authorName || 'Staff',
      createdAt: n.createdAt,
    })),
    adminTags: o.adminTags || [],
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}

async function assertInstitutionStudent(institutionId, studentRecordId) {
  const doc = await InstitutionStudent.findOne({
    _id: studentRecordId,
    institutionId,
  })
  if (!doc) throw err('Student not found', 404)
  return doc
}

function buildListQuery(institutionId, filters = {}) {
  const query = { institutionId: new mongoose.Types.ObjectId(institutionId) }

  if (filters.status) query.status = filters.status
  if (filters.department) query.department = filters.department
  if (filters.course) query.course = filters.course
  if (filters.semester) query.semester = filters.semester
  if (filters.section) query.section = filters.section
  if (filters.batch) query.batch = filters.batch
  if (filters.academicYear) query.academicYear = filters.academicYear
  if (filters.admissionYear) query.admissionYear = filters.admissionYear
  if (filters.gender) query.gender = filters.gender
  if (filters.scholarshipStatus) query.scholarshipStatus = filters.scholarshipStatus
  if (filters.placementStatus) query['placement.status'] = filters.placementStatus

  const q = sanitizeText(filters.q, 200)
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [
      { fullName: regex },
      { studentId: regex },
      { rollNumber: regex },
      { email: regex },
      { department: regex },
      { course: regex },
      { batch: regex },
      { semester: regex },
      { section: regex },
      { sharedSkills: regex },
      { 'sharedProjects.title': regex },
      { 'certifications.title': regex },
    ]
  }

  if (filters.skill) {
    const skillRegex = new RegExp(
      sanitizeText(filters.skill, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i',
    )
    query.$and = query.$and || []
    query.$and.push({
      $or: [{ sharedSkills: skillRegex }, { verifiedSkills: skillRegex }],
    })
  }

  return query
}

async function listStudents(institutionId, filters = {}) {
  const page = Math.max(1, parseInt(filters.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20))
  const skip = (page - 1) * limit
  const query = buildListQuery(institutionId, filters)

  const sortField = SORT_FIELDS[filters.sort] || SORT_FIELDS.fullName
  const sortDir = filters.sortDir === 'desc' ? -1 : 1
  const sort = { [sortField]: sortDir }

  const [items, total] = await Promise.all([
    InstitutionStudent.find(query).select(DIRECTORY_PROJECTION).sort(sort).skip(skip).limit(limit).lean(),
    InstitutionStudent.countDocuments(query),
  ])

  return {
    items: items.map(serializeDirectory),
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 1,
  }
}

async function getStudentDetail(institutionId, studentRecordId) {
  const doc = await assertInstitutionStudent(institutionId, studentRecordId)
  const notes = await InstitutionStudentNote.find({
    institutionId,
    studentId: doc._id,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()
  return serializeDetail(doc, notes)
}

async function getStats(institutionId) {
  return institutionCache.getOrSet(
    institutionCache.makeKey('stats', institutionId),
    institutionCache.CACHE_TTL_MS.stats,
    async () => {
      const base = { institutionId: new mongoose.Types.ObjectId(institutionId) }
      const [
        total,
        byStatus,
        byDept,
        placementReady,
        placementEligible,
        placedStudents,
        pendingVerifications,
        recentlyAdded,
        recentActivity,
      ] = await Promise.all([
        InstitutionStudent.countDocuments(base),
        InstitutionStudent.aggregate([
          { $match: base },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        InstitutionStudent.aggregate([
          { $match: base },
          { $group: { _id: '$department', count: { $sum: 1 } } },
        ]),
        InstitutionStudent.countDocuments({
          ...base,
          'placement.status': { $in: ['placement-ready', 'interviewing', 'placed'] },
        }),
        InstitutionStudent.countDocuments({
          ...base,
          'placement.lifecycleStatus': { $in: ['ELIGIBLE', 'READY', 'APPLYING'] },
        }),
        InstitutionStudent.countDocuments({
          ...base,
          $or: [
            { 'placement.lifecycleStatus': 'PLACED' },
            { 'placement.status': 'placed' },
          ],
        }),
        InstitutionStudent.countDocuments({
          ...base,
          $or: [
            { 'certifications.verificationStatus': { $in: ['SELF_UPLOADED', 'pending'] } },
            { 'achievements.verificationStatus': 'pending' },
          ],
        }),
        InstitutionStudent.find(base)
          .sort({ createdAt: -1 })
          .limit(5)
          .select('fullName rollNumber department createdAt')
          .lean(),
        require('./institutionAuditService').getAuditLog(institutionId, null, {
          page: 1,
          limit: 8,
        }),
      ])

      const statusMap = Object.fromEntries(byStatus.map((s) => [s._id, s.count]))
      return {
        total,
        active: statusMap.active || 0,
        inactive: statusMap.inactive || 0,
        graduated: statusMap.graduated || 0,
        suspended: statusMap.suspended || 0,
        departments: byDept.length,
        placementReady,
        placementEligible,
        placedStudents,
        pendingVerifications,
        byStatus: statusMap,
        byDepartment: Object.fromEntries(byDept.map((d) => [d._id || 'Unknown', d.count])),
        recentlyAdded: recentlyAdded.map((s) => ({
          id: s._id.toString(),
          fullName: s.fullName,
          rollNumber: s.rollNumber,
          department: s.department,
          createdAt: s.createdAt,
        })),
        recentActivity: recentActivity.items.map(serializeAuditEntry),
      }
    },
  )
}

async function getFilterOptions(institutionId) {
  return institutionCache.getOrSet(
    institutionCache.makeKey('filters', institutionId),
    institutionCache.CACHE_TTL_MS.filters,
    async () => {
      const base = { institutionId: new mongoose.Types.ObjectId(institutionId) }
      const [departments, courses, semesters, sections, batches, academicYears, admissionYears] =
        await Promise.all([
          InstitutionStudent.distinct('department', base),
          InstitutionStudent.distinct('course', base),
          InstitutionStudent.distinct('semester', base),
          InstitutionStudent.distinct('section', base),
          InstitutionStudent.distinct('batch', base),
          InstitutionStudent.distinct('academicYear', base),
          InstitutionStudent.distinct('admissionYear', base),
        ])
      return {
        departments: departments.filter(Boolean).sort(),
        courses: courses.filter(Boolean).sort(),
        semesters: semesters.filter(Boolean).sort(),
        sections: sections.filter(Boolean).sort(),
        batches: batches.filter(Boolean).sort(),
        academicYears: academicYears.filter(Boolean).sort(),
        admissionYears: admissionYears.filter(Boolean).sort(),
      }
    },
  )
}

async function createStudent(institutionId, actorUserId, payload, actorName = 'Staff') {
  const fullName = sanitizeText(payload.fullName, 200)
  if (!fullName) throw err('fullName is required')

  const studentId =
    sanitizeText(payload.studentId, 50) ||
    `STU-${Date.now().toString(36).toUpperCase()}`

  const existing = await InstitutionStudent.findOne({ institutionId, studentId })
  if (existing) throw apiError('Student ID already exists', 409, ERROR_CODES.DUPLICATE)

  const email = sanitizeText(payload.email, 200)
  if (email) {
    const emailTaken = await InstitutionStudent.findOne({ institutionId, email })
    if (emailTaken) throw apiError('Email already registered for this institution', 409, ERROR_CODES.DUPLICATE)
  }

  const doc = await InstitutionStudent.create({
    institutionId,
    linkedUserId: payload.linkedUserId || null,
    studentId,
    rollNumber: sanitizeText(payload.rollNumber, 50),
    photoInitials: initials(fullName),
    fullName,
    email: sanitizeText(payload.email, 200),
    phone: sanitizeText(payload.phone, 30),
    department: sanitizeText(payload.department, 100),
    course: sanitizeText(payload.course, 100),
    branch: sanitizeText(payload.branch || payload.department, 100),
    semester: sanitizeText(payload.semester, 50),
    section: sanitizeText(payload.section, 20),
    academicYear: sanitizeText(payload.academicYear, 20),
    admissionYear: sanitizeText(payload.admissionYear, 20),
    batch: sanitizeText(payload.batch, 20),
    status: payload.status || 'active',
    gender: payload.gender || 'prefer-not-to-say',
    cgpa: payload.cgpa ?? 0,
    backlogs: payload.backlogs ?? 0,
    expectedGraduation: sanitizeText(payload.expectedGraduation, 20),
    sharedSkills: payload.sharedSkills || [],
    sharedProjects: payload.sharedProjects || [],
    placement: payload.placement || { status: 'not-started' },
    createdByUserId: actorUserId,
  })

  invalidateInstitutionCache(institutionId)
  await recordAudit({
    institutionId,
    studentId: doc._id,
    action: 'student_created',
    actorUserId,
    actorName,
    description: `Student added: ${doc.fullName}`,
    metadata: { rollNumber: doc.rollNumber },
  }).catch(() => {})

  return serializeDetail(doc, [])
}

const UPDATABLE_FIELDS = [
  'rollNumber',
  'fullName',
  'email',
  'phone',
  'department',
  'course',
  'branch',
  'semester',
  'section',
  'academicYear',
  'admissionYear',
  'batch',
  'status',
  'gender',
  'cgpa',
  'attendance',
  'backlogs',
  'sharedSkills',
  'verifiedSkills',
  'softSkills',
  'programmingLanguages',
  'sharedProjects',
  'certifications',
  'achievements',
  'placement',
  'scholarshipStatus',
  'profileStatus',
  'adminTags',
]

async function updateStudent(institutionId, studentRecordId, payload, actor = {}) {
  const doc = await assertInstitutionStudent(institutionId, studentRecordId)
  const previousTags = [...(doc.adminTags || [])]

  if (payload.email !== undefined) {
    const email = sanitizeText(payload.email, 200)
    if (email) {
      const emailTaken = await InstitutionStudent.findOne({
        institutionId,
        email,
        _id: { $ne: doc._id },
      })
      if (emailTaken) {
        throw apiError('Email already registered for this institution', 409, ERROR_CODES.DUPLICATE)
      }
    }
  }

  for (const field of UPDATABLE_FIELDS) {
    if (payload[field] !== undefined) doc[field] = payload[field]
  }
  if (payload.fullName) doc.photoInitials = initials(doc.fullName)
  await doc.save()

  invalidateInstitutionCache(institutionId)

  const tagsChanged =
    payload.adminTags !== undefined &&
    JSON.stringify(previousTags.sort()) !== JSON.stringify([...(doc.adminTags || [])].sort())

  await recordAudit({
    institutionId,
    studentId: doc._id,
    action: tagsChanged ? 'tags_updated' : 'student_updated',
    actorUserId: actor.userId,
    actorName: actor.name || 'Staff',
    description: tagsChanged
      ? `Tags updated for ${doc.fullName}`
      : `Student updated: ${doc.fullName}`,
    previousState: tagsChanged ? previousTags.join(', ') : '',
    newState: tagsChanged ? (doc.adminTags || []).join(', ') : '',
  }).catch(() => {})

  const notes = await InstitutionStudentNote.find({
    institutionId,
    studentId: doc._id,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()
  return serializeDetail(doc, notes)
}

async function addNote(institutionId, studentRecordId, actorUserId, authorName, content, noteType = 'internal') {
  const doc = await assertInstitutionStudent(institutionId, studentRecordId)
  const note = await InstitutionStudentNote.create({
    institutionId,
    studentId: studentRecordId,
    content: sanitizeText(content),
    type: noteType,
    authorUserId: actorUserId,
    authorName: sanitizeText(authorName, 100),
  })

  invalidateInstitutionCache(institutionId)
  await recordAudit({
    institutionId,
    studentId: studentRecordId,
    action: 'note_added',
    actorUserId,
    actorName: authorName,
    description: `Note added for ${doc.fullName}`,
    metadata: { noteType },
  }).catch(() => {})

  return {
    id: note._id.toString(),
    text: note.content,
    type: note.type,
    author: note.authorName,
    createdAt: note.createdAt,
  }
}

async function verifySkill(institutionId, studentRecordId, skill) {
  const doc = await assertInstitutionStudent(institutionId, studentRecordId)
  const normalized = sanitizeText(skill, 100)
  if (!normalized) throw err('skill is required')
  const pool = [
    ...(doc.sharedSkills || []),
    ...(doc.programmingLanguages || []),
    ...(doc.certifications || []).map((c) => c.title),
    ...(doc.sharedProjects || []).flatMap((p) => p.technologies || []),
  ].map((s) => s.toLowerCase())
  if (!pool.some((s) => s.includes(normalized.toLowerCase()))) {
    throw err('Skill must be supported by shared profile, project, or certificate data')
  }
  if (!doc.verifiedSkills.includes(normalized)) {
    doc.verifiedSkills.push(normalized)
    await doc.save()
    invalidateInstitutionCache(institutionId)
    await recordAudit({
      institutionId,
      studentId: doc._id,
      action: 'skill_verified',
      actorName: 'Staff',
      description: `Skill verified: ${normalized} for ${doc.fullName}`,
      metadata: { skill: normalized },
    }).catch(() => {})
  }
  return serializeDetail(doc, [])
}

async function importStudents(institutionId, actorUserId, rows) {
  if (!Array.isArray(rows) || !rows.length) throw err('rows array required')
  const results = []
  for (const row of rows) {
    try {
      results.push(await createStudent(institutionId, actorUserId, row))
    } catch (e) {
      results.push({ error: e.message, row: row.fullName || row.email })
    }
  }
  invalidateInstitutionCache(institutionId)
  return results
}

async function promoteSemester(institutionId, studentRecordId) {
  const doc = await assertInstitutionStudent(institutionId, studentRecordId)
  const current = Number(doc.semester.match(/\d+/)?.[0] ?? 1)
  const next = Math.min(8, current + 1)
  doc.semester = `Semester ${next}`
  if (next === 8 && current === 8) doc.status = 'graduated'
  await doc.save()
  return serializeDetail(doc, [])
}

async function getActivityTimeline(institutionId, options = {}) {
  const { getAuditLog } = require('./institutionAuditService')
  const result = await getAuditLog(institutionId, null, options)
  return {
    ...result,
    items: result.items.map(serializeAuditEntry),
  }
}

module.exports = {
  listStudents,
  getStudentDetail,
  getStats,
  getFilterOptions,
  getActivityTimeline,
  createStudent,
  updateStudent,
  addNote,
  verifySkill,
  importStudents,
  promoteSemester,
  assertInstitutionStudent,
  serializeDirectory,
  serializeDetail,
  buildListQuery,
}
