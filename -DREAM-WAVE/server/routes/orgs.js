const express = require('express');
const ctrl = require('../controllers/orgController');
const inst = require('../controllers/institutionController');
const acad = require('../controllers/institutionAcademicController');
const { protect } = require('../middleware/auth');
const {
  requireOrgRoles,
  requireOrgMember,
  requireOrgAdminOrTeacher,
  requireCompanyOrg,
  requireCompanyRecruiter,
  ORG_ROLES,
} = require('../middleware/orgAuth');
const { requireVerifiedEmail } = require('../middleware/requireVerifiedEmail');
const { zodValidate } = require('../middleware/validate');
const { z } = require('zod');
const company = require('../controllers/companyController');
const cjobs = require('../controllers/companyJobsController');
const { uploadImage } = require('../middleware/upload');

const admin = requireOrgRoles(ORG_ROLES.OWNER, ORG_ROLES.ADMIN);
const member = requireOrgMember();
const teacherOrAdmin = requireOrgAdminOrTeacher();
const companyAdmin = requireCompanyOrg(ORG_ROLES.OWNER, ORG_ROLES.ADMIN);
const companyMember = requireCompanyOrg(ORG_ROLES.OWNER, ORG_ROLES.ADMIN, ORG_ROLES.MEMBER);
const companyRecruiter = requireCompanyRecruiter();

const objectId = z.string().min(1).max(40);

const createSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(['institution', 'company', 'team']).optional(),
  institutionKind: z.enum(['school', 'college', 'university', 'other']).optional(),
  profile: z
    .object({
      description: z.string().max(2000).optional(),
      website: z.string().max(200).optional(),
      phone: z.string().max(40).optional(),
      email: z.string().max(120).optional(),
      address: z.string().max(300).optional(),
      city: z.string().max(80).optional(),
      state: z.string().max(80).optional(),
      country: z.string().max(80).optional(),
    })
    .optional(),
  company: z
    .object({
      industry: z.string().max(120).optional(),
      size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
      locations: z.array(z.any()).max(10).optional(),
    })
    .optional(),
});

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).optional(),
  memberKind: z.enum(['staff', 'teacher', 'student', 'recruiter']).optional(),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});

const memberProfileSchema = z
  .object({
    memberKind: z.enum(['staff', 'teacher', 'student', 'recruiter']).optional(),
    title: z.string().max(120).optional(),
    department: z.string().nullable().optional(),
    branch: z.string().nullable().optional(),
  })
  .strict();

const profileSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    institutionKind: z.enum(['school', 'college', 'university', 'other']).optional(),
    profile: z
      .object({
        description: z.string().max(2000).optional(),
        website: z.string().max(200).optional(),
        phone: z.string().max(40).optional(),
        email: z.string().max(120).optional(),
        address: z.string().max(300).optional(),
        city: z.string().max(80).optional(),
        state: z.string().max(80).optional(),
        country: z.string().max(80).optional(),
        logoUrl: z.string().max(300).optional(),
      })
      .optional(),
  })
  .strict();

const settingsSchema = z
  .object({
    timezone: z.string().max(60).optional(),
    locale: z.string().max(10).optional(),
    attendanceRequiredPercent: z.number().min(0).max(100).optional(),
    notificationsEnabled: z.boolean().optional(),
    academicYearLabel: z.string().max(40).optional(),
  })
  .strict();

const namedEntity = z.object({
  name: z.string().min(1).max(160),
  code: z.string().max(30).optional(),
  description: z.string().max(2000).optional(),
  active: z.boolean().optional(),
});

const branchSchema = namedEntity.extend({
  address: z.string().max(300).optional(),
  city: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
});

const departmentSchema = namedEntity.extend({
  branch: objectId.nullable().optional(),
  headTeacher: objectId.nullable().optional(),
});

const yearSchema = z.object({
  name: z.string().min(2).max(40),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  isCurrent: z.boolean().optional(),
  active: z.boolean().optional(),
});

const semesterSchema = z.object({
  academicYear: objectId,
  name: z.string().min(1).max(60),
  order: z.number().int().min(1).max(12).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional(),
  active: z.boolean().optional(),
});

const courseSchema = namedEntity.extend({
  department: objectId.nullable().optional(),
  credits: z.number().min(0).max(60).optional(),
  durationMonths: z.number().int().min(1).max(72).optional(),
});

const subjectSchema = namedEntity.extend({
  course: objectId.nullable().optional(),
  department: objectId.nullable().optional(),
  credits: z.number().min(0).max(30).optional(),
});

const classSchema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().max(30).optional(),
  branch: objectId.nullable().optional(),
  department: objectId.nullable().optional(),
  course: objectId.nullable().optional(),
  academicYear: objectId.nullable().optional(),
  semester: objectId.nullable().optional(),
  classTeacher: objectId.nullable().optional(),
  teachers: z.array(objectId).optional(),
  students: z.array(objectId).optional(),
  subjects: z.array(objectId).optional(),
  capacity: z.number().int().min(1).max(500).optional(),
  room: z.string().max(60).optional(),
  active: z.boolean().optional(),
});

const classAssignSchema = z
  .object({
    addStudents: z.array(objectId).optional(),
    removeStudents: z.array(objectId).optional(),
    addTeachers: z.array(objectId).optional(),
    removeTeachers: z.array(objectId).optional(),
  })
  .strict();

const timetableSchema = z.object({
  classSection: objectId,
  subject: objectId.nullable().optional(),
  teacher: objectId.nullable().optional(),
  dayOfWeek: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  room: z.string().max(60).optional(),
  notes: z.string().max(300).optional(),
});

const attendanceSchema = z.object({
  classSection: objectId,
  date: z.string().optional(),
  entries: z
    .array(
      z.object({
        student: objectId,
        status: z.enum(['present', 'absent', 'late', 'excused']).optional(),
        subject: objectId.nullable().optional(),
        notes: z.string().max(300).optional(),
      })
    )
    .min(1)
    .max(500),
});

const notificationSchema = z.object({
  title: z.string().min(2).max(160),
  message: z.string().min(2).max(2000),
  type: z.enum(['info', 'success', 'warning', 'system', 'academic']).optional(),
  audience: z.enum(['all', 'teachers', 'students', 'staff', 'admins']).optional(),
  link: z.string().max(200).optional(),
});

const aiAssistSchema = z.object({
  message: z.string().min(2).max(4000),
  mode: z.string().max(40).optional(),
});

const reportSchema = z.object({
  title: z.string().max(200).optional(),
  focus: z.string().max(400).optional(),
});

const router = express.Router();

router.get('/invite/:token', ctrl.previewInvite);

router.use(protect);

router.post('/', zodValidate(createSchema), ctrl.create);
router.get('/me', ctrl.me);

/* ——— Institution profile / dashboard ——— */
router.get('/:id/profile', member, inst.getProfile);
router.patch('/:id/profile', admin, zodValidate(profileSchema), inst.updateProfile);
router.patch('/:id/settings', admin, zodValidate(settingsSchema), inst.updateSettings);
router.get('/:id/dashboard', admin, inst.dashboard);
router.get('/:id/overview', admin, ctrl.overview);
router.get('/:id/analytics', admin, inst.analytics);
router.post(
  '/:id/reports/generate',
  admin,
  requireVerifiedEmail,
  zodValidate(reportSchema),
  inst.generateReport
);
router.post(
  '/:id/ai',
  admin,
  requireVerifiedEmail,
  zodValidate(aiAssistSchema),
  inst.aiAssist
);

/* ——— Members / teachers / students ——— */
router.get('/:id/members', admin, ctrl.listMembers);
router.get('/:id/teachers', admin, inst.listTeachers);
router.get('/:id/students', admin, inst.listStudents);
router.get('/:id/invites', admin, ctrl.listInvites);
router.delete('/:id/invites/:inviteId', admin, ctrl.revokeInvite);
router.post('/:id/members', admin, zodValidate(addMemberSchema), ctrl.addMember);
router.patch(
  '/:id/members/:membershipId',
  admin,
  zodValidate(updateMemberRoleSchema),
  ctrl.updateMemberRole
);
router.patch(
  '/:id/members/:membershipId/profile',
  admin,
  zodValidate(memberProfileSchema),
  inst.updateMemberProfile
);
router.delete('/:id/members/:membershipId', admin, ctrl.removeMember);

/* ——— Structure ——— */
router.get('/:id/branches', member, acad.listBranches);
router.post('/:id/branches', admin, zodValidate(branchSchema), acad.createBranch);
router.patch('/:id/branches/:branchId', admin, acad.updateBranch);
router.delete('/:id/branches/:branchId', admin, acad.removeBranch);

router.get('/:id/departments', member, acad.listDepartments);
router.post('/:id/departments', admin, zodValidate(departmentSchema), acad.createDepartment);
router.patch('/:id/departments/:departmentId', admin, acad.updateDepartment);
router.delete('/:id/departments/:departmentId', admin, acad.removeDepartment);

router.get('/:id/academic-years', member, acad.listAcademicYears);
router.post('/:id/academic-years', admin, zodValidate(yearSchema), acad.createAcademicYear);
router.patch('/:id/academic-years/:yearId', admin, acad.updateAcademicYear);
router.delete('/:id/academic-years/:yearId', admin, acad.removeAcademicYear);

router.get('/:id/semesters', member, acad.listSemesters);
router.post('/:id/semesters', admin, zodValidate(semesterSchema), acad.createSemester);
router.patch('/:id/semesters/:semesterId', admin, acad.updateSemester);
router.delete('/:id/semesters/:semesterId', admin, acad.removeSemester);

router.get('/:id/courses', member, acad.listCourses);
router.post('/:id/courses', admin, zodValidate(courseSchema), acad.createCourse);
router.patch('/:id/courses/:courseId', admin, acad.updateCourse);
router.delete('/:id/courses/:courseId', admin, acad.removeCourse);

router.get('/:id/subjects', member, acad.listSubjects);
router.post('/:id/subjects', admin, zodValidate(subjectSchema), acad.createSubject);
router.patch('/:id/subjects/:subjectId', admin, acad.updateSubject);
router.delete('/:id/subjects/:subjectId', admin, acad.removeSubject);

router.get('/:id/classes', member, acad.listClasses);
router.post('/:id/classes', admin, zodValidate(classSchema), acad.createClass);
router.patch('/:id/classes/:classId', admin, acad.updateClass);
router.post(
  '/:id/classes/:classId/assign',
  admin,
  zodValidate(classAssignSchema),
  acad.assignClassMembers
);
router.delete('/:id/classes/:classId', admin, acad.removeClass);

/* ——— Timetable & attendance ——— */
router.get('/:id/timetable', member, acad.listTimetable);
router.post('/:id/timetable', admin, zodValidate(timetableSchema), acad.createTimetableEntry);
router.patch('/:id/timetable/:entryId', admin, acad.updateTimetableEntry);
router.delete('/:id/timetable/:entryId', admin, acad.removeTimetableEntry);

router.get('/:id/attendance', teacherOrAdmin, acad.listAttendance);
router.get('/:id/attendance/summary', teacherOrAdmin, acad.attendanceSummary);
router.post(
  '/:id/attendance',
  teacherOrAdmin,
  zodValidate(attendanceSchema),
  acad.markAttendance
);

/* ——— Notifications ——— */
router.get('/:id/notifications', member, inst.listNotifications);
router.post('/:id/notifications', admin, zodValidate(notificationSchema), inst.createNotification);
router.patch('/:id/notifications/:notificationId/read', member, inst.markNotificationRead);
router.delete('/:id/notifications/:notificationId', admin, inst.deleteNotification);

/* ——— Company platform ——— */
const companyProfileSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    profile: z
      .object({
        description: z.string().max(2000).optional(),
        website: z.string().max(200).optional(),
        phone: z.string().max(40).optional(),
        email: z.string().max(120).optional(),
        address: z.string().max(300).optional(),
        city: z.string().max(80).optional(),
        state: z.string().max(80).optional(),
        country: z.string().max(80).optional(),
        logoUrl: z.string().max(300).optional(),
      })
      .optional(),
    company: z
      .object({
        industry: z.string().max(120).optional(),
        size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+', '']).optional(),
        locations: z
          .array(
            z.object({
              label: z.string().max(80).optional(),
              city: z.string().max(80).optional(),
              state: z.string().max(80).optional(),
              country: z.string().max(80).optional(),
              isPrimary: z.boolean().optional(),
            })
          )
          .max(20)
          .optional(),
      })
      .optional(),
  })
  .strict();

const jobCreateSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(10000).optional(),
  category: z.string().max(80).optional(),
  skills: z.array(z.string().max(60)).max(40).optional(),
  salary: z
    .object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional(),
      currency: z.string().max(8).optional(),
      period: z.enum(['year', 'month', 'hour']).optional(),
    })
    .optional(),
  location: z.string().max(160).optional(),
  workMode: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  status: z.enum(['draft', 'published']).optional(),
  openings: z.number().int().min(1).max(500).optional(),
  experienceMinYears: z.number().min(0).max(40).optional(),
  experienceMaxYears: z.number().min(0).max(40).optional(),
  education: z.string().max(160).optional(),
  closesAt: z.string().optional().nullable(),
});

const jobUpdateSchema = jobCreateSchema.partial().strict();

const applicationStatusSchema = z.object({
  status: z.enum(['applied', 'reviewing', 'shortlisted', 'interview', 'rejected', 'hired']),
  note: z.string().max(500).optional(),
});

const interviewSchema = z.object({
  scheduledAt: z.string().min(1),
  mode: z.enum(['online', 'onsite', 'phone']).optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  meetingUrl: z.string().max(300).optional(),
});

const messageSchema = z.object({
  toUser: objectId,
  body: z.string().min(1).max(4000),
  job: objectId.optional().nullable(),
  application: objectId.optional().nullable(),
});

router.get('/:id/company/profile', companyMember, company.getProfile);
router.patch(
  '/:id/company/profile',
  companyAdmin,
  zodValidate(companyProfileSchema),
  company.updateProfile
);
router.post('/:id/company/logo', companyAdmin, uploadImage.single('logo'), company.uploadLogo);
router.post('/:id/company/verification', companyAdmin, company.requestVerification);
router.get('/:id/company/dashboard', companyAdmin, company.dashboard);
router.get('/:id/company/analytics', companyAdmin, company.analytics);
router.get('/:id/company/talent', companyRecruiter, company.talentSearch);
router.get('/:id/company/messages', companyRecruiter, company.listMessages);
router.post(
  '/:id/company/messages',
  companyRecruiter,
  zodValidate(messageSchema),
  company.sendMessage
);
router.get('/:id/company/audit-logs', companyAdmin, company.listAuditLogs);
router.post(
  '/:id/company/notifications',
  companyAdmin,
  zodValidate(notificationSchema),
  company.createNotification
);

router.get('/:id/jobs', companyMember, cjobs.listJobs);
router.post('/:id/jobs', companyRecruiter, zodValidate(jobCreateSchema), cjobs.createJob);
router.get('/:id/jobs/:jobId', companyMember, cjobs.getJob);
router.patch('/:id/jobs/:jobId', companyRecruiter, zodValidate(jobUpdateSchema), cjobs.updateJob);
router.post('/:id/jobs/:jobId/publish', companyRecruiter, cjobs.publishJob);
router.post('/:id/jobs/:jobId/draft', companyRecruiter, cjobs.draftJob);
router.post('/:id/jobs/:jobId/archive', companyRecruiter, cjobs.archiveJob);
router.delete('/:id/jobs/:jobId', companyAdmin, cjobs.removeJob);

router.get('/:id/applications', companyRecruiter, cjobs.listApplications);
router.get('/:id/applications/:applicationId', companyRecruiter, cjobs.getApplication);
router.patch(
  '/:id/applications/:applicationId/status',
  companyRecruiter,
  zodValidate(applicationStatusSchema),
  cjobs.updateApplicationStatus
);
router.post(
  '/:id/applications/:applicationId/interview',
  companyRecruiter,
  zodValidate(interviewSchema),
  cjobs.scheduleInterview
);

module.exports = router;
