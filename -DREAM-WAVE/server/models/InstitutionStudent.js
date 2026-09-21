const mongoose = require('mongoose')
const {
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
} = require('../constants/institutionStudents')
const { ADMIN_TAGS } = require('../constants/institutionPermissions')

const institutionStudentSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    /** Optional link to platform User — never auto-expose UserProfile/AI data */
    linkedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    /** Legacy alias used by older institution portal CRUD (maps to linkedUserId) */
    studentUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    studentId: { type: String, trim: true, required: true },
    rollNumber: { type: String, trim: true, default: '' },
    /** Legacy alias for rollNumber */
    rollNo: { type: String, trim: true, default: '' },
    photoInitials: { type: String, trim: true, default: '' },
    fullName: { type: String, trim: true, required: true },
    /** Legacy alias for fullName (older portal forms) */
    name: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    department: { type: String, trim: true, default: '', index: true },
    course: { type: String, trim: true, default: '', index: true },
    branch: { type: String, trim: true, default: '' },
    semester: { type: String, trim: true, default: '', index: true },
    section: { type: String, trim: true, default: '', index: true },
    academicYear: { type: String, trim: true, default: '' },
    admissionYear: { type: String, trim: true, default: '' },
    batch: { type: String, trim: true, default: '', index: true },
    year: { type: String, trim: true, default: '' },
    admissionDate: { type: mongoose.Schema.Types.Mixed, default: '' },
    attendancePercent: { type: Number, default: 0 },
    gpa: { type: Number, default: 0 },
    academicNotes: { type: String, default: '' },
    performanceReport: { type: String, default: '' },
    status: {
      type: String,
      enum: [...STUDENT_STATUSES, 'dropped', 'pending'],
      default: 'active',
      index: true,
    },
    gender: {
      type: String,
      enum: ['female', 'male', 'non-binary', 'prefer-not-to-say'],
      default: 'prefer-not-to-say',
    },
    dateOfBirth: { type: String, trim: true, default: '' },
    bloodGroup: { type: String, trim: true, default: '' },
    nationality: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    emergencyContact: { type: String, trim: true, default: '' },
    guardian: {
      fatherName: { type: String, trim: true, default: '' },
      motherName: { type: String, trim: true, default: '' },
      guardianName: { type: String, trim: true, default: '' },
      occupation: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },
    },
    creditsEarned: { type: Number, default: 0 },
    currentSubjects: [{ type: String, trim: true }],
    cgpa: { type: Number, default: null },
    backlogs: { type: Number, default: 0 },
    expectedGraduation: { type: String, trim: true, default: '' },
    academicAdvisor: { type: String, trim: true, default: '' },
    attendance: { type: Number, default: 0 },
    performance: [{ type: Number }],
    /** Student-shared + institution-verified skills only */
    sharedSkills: [{ type: String, trim: true }],
    verifiedSkills: [{ type: String, trim: true }],
    softSkills: [{ type: String, trim: true }],
    programmingLanguages: [{ type: String, trim: true }],
    languagesKnown: [{ type: String, trim: true }],
    sharedProjects: [
      {
        title: { type: String, trim: true, default: '' },
        description: { type: String, trim: true, default: '' },
        role: { type: String, trim: true, default: '' },
        technologies: [{ type: String, trim: true }],
        repositoryUrl: { type: String, trim: true, default: '' },
        demoUrl: { type: String, trim: true, default: '' },
        status: { type: String, enum: PROJECT_STATUSES, default: 'in-progress' },
        visibility: { type: String, enum: PROJECT_VISIBILITY, default: 'shared' },
        teamMembers: [{ type: String, trim: true }],
        verificationStatus: {
          type: String,
          enum: VERIFICATION_STATUSES,
          default: 'unverified',
        },
      },
    ],
    internships: [{ type: String, trim: true }],
    /** Legacy simple certificate list from older portal CRUD */
    certificates: [{ title: String, issuedAt: Date, url: String }],
    certifications: [
      {
        title: { type: String, trim: true, default: '' },
        category: { type: String, trim: true, default: 'academic' },
        issuer: { type: String, trim: true, default: '' },
        issuingOrganization: { type: String, trim: true, default: '' },
        issuedAt: { type: String, trim: true, default: '' },
        issueDate: { type: String, trim: true, default: '' },
        expiryDate: { type: String, trim: true, default: '' },
        credentialId: { type: String, trim: true, default: '' },
        verificationStatus: {
          type: String,
          enum: CERTIFICATE_VERIFICATION,
          default: 'SELF_UPLOADED',
        },
        skillsCovered: [{ type: String, trim: true }],
        certificateUrl: { type: String, trim: true, default: '' },
        visibility: {
          type: String,
          enum: CERTIFICATE_VISIBILITY,
          default: 'private',
        },
        isInstitutionIssued: { type: Boolean, default: false },
      },
    ],
    researchPapers: [{ type: String, trim: true }],
    achievements: [
      {
        title: { type: String, trim: true, default: '' },
        type: { type: String, enum: ACHIEVEMENT_TYPES, default: 'other' },
        description: { type: String, trim: true, default: '' },
        date: { type: String, trim: true, default: '' },
        verificationStatus: {
          type: String,
          enum: ['pending', 'verified'],
          default: 'pending',
        },
        verifiedAt: { type: Date, default: null },
        verifiedByUserId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
      },
    ],
    documents: [
      {
        name: { type: String, trim: true, default: '' },
        type: { type: String, enum: DOCUMENT_TYPES, default: 'other' },
        status: {
          type: String,
          enum: ['verified', 'pending', 'missing'],
          default: 'pending',
        },
        fileName: { type: String, trim: true, default: '' },
        storageKey: { type: String, trim: true, default: '' },
        visibility: {
          type: String,
          enum: DOCUMENT_VISIBILITY,
          default: 'private',
        },
        uploadedAt: { type: Date, default: null },
      },
    ],
    cohortIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionCohort' }],
    placement: {
      lifecycleStatus: {
        type: String,
        enum: PLACEMENT_LIFECYCLE,
        default: 'NOT_ELIGIBLE',
        index: true,
      },
      statusSource: {
        type: String,
        enum: PLACEMENT_STATUS_SOURCES,
        default: 'system',
      },
      statusHistory: [
        {
          status: { type: String, trim: true },
          source: { type: String, enum: PLACEMENT_STATUS_SOURCES },
          actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          at: { type: Date, default: Date.now },
        },
      ],
      status: {
        type: String,
        enum: PLACEMENT_STATUSES,
        default: 'not-started',
      },
      resumeUploaded: { type: Boolean, default: false },
      internshipsCompleted: { type: Number, default: 0 },
      jobsApplied: { type: Number, default: 0 },
      interviewProgress: { type: String, trim: true, default: '' },
      offerStatus: { type: String, trim: true, default: '' },
      companyName: { type: String, trim: true, default: '' },
      roleTitle: { type: String, trim: true, default: '' },
    },
    scholarshipStatus: {
      type: String,
      enum: SCHOLARSHIP_STATUSES,
      default: 'none',
    },
    profileStatus: {
      type: String,
      enum: PROFILE_STATUSES,
      default: 'partial',
    },
    adminTags: [{ type: String, enum: ADMIN_TAGS }],
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
)

institutionStudentSchema.pre('validate', function syncLegacyAliases(next) {
  if (this.name && !this.fullName) this.fullName = this.name
  if (this.fullName && !this.name) this.name = this.fullName
  if (this.rollNo && !this.rollNumber) this.rollNumber = this.rollNo
  if (this.rollNumber && !this.rollNo) this.rollNo = this.rollNumber
  if (this.studentUserId && !this.linkedUserId) this.linkedUserId = this.studentUserId
  if (this.linkedUserId && !this.studentUserId) this.studentUserId = this.linkedUserId
  if (this.attendancePercent && !this.attendance) this.attendance = this.attendancePercent
  if (this.gpa && this.cgpa == null) this.cgpa = this.gpa
  if (!this.studentId && (this.rollNumber || this.rollNo || this.email)) {
    this.studentId = String(this.rollNumber || this.rollNo || this.email).trim()
  }
  next()
})

institutionStudentSchema.index({ institutionId: 1, studentId: 1 }, { unique: true })
institutionStudentSchema.index({ institutionId: 1, rollNumber: 1 })
institutionStudentSchema.index({ institutionId: 1, status: 1, updatedAt: -1 })
institutionStudentSchema.index({ institutionId: 1, department: 1 })
institutionStudentSchema.index({ institutionId: 1, course: 1 })
institutionStudentSchema.index({ institutionId: 1, batch: 1 })
institutionStudentSchema.index({ institutionId: 1, 'placement.lifecycleStatus': 1 })
institutionStudentSchema.index({ institutionId: 1, email: 1 })
institutionStudentSchema.index({ institutionId: 1, createdAt: -1 })
institutionStudentSchema.index({
  fullName: 'text',
  studentId: 'text',
  rollNumber: 'text',
  email: 'text',
  department: 'text',
  course: 'text',
  batch: 'text',
  sharedSkills: 'text',
})

module.exports = mongoose.model('InstitutionStudent', institutionStudentSchema)
