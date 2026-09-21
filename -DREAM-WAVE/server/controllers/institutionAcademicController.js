const Organization = require('../models/Organization');
const Branch = require('../models/Branch');
const Department = require('../models/Department');
const AcademicYear = require('../models/AcademicYear');
const Semester = require('../models/Semester');
const Course = require('../models/Course');
const Subject = require('../models/Subject');
const ClassSection = require('../models/ClassSection');
const TimetableEntry = require('../models/TimetableEntry');
const AttendanceRecord = require('../models/AttendanceRecord');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { pick } = require('../utils/helpers');
const mongoose = require('mongoose');

async function loadOrg(req) {
  const org = await Organization.findById(req.params.id);
  if (!org) throw new AppError('Organization not found', 404);
  return org;
}

function orgObjectId(req) {
  return new mongoose.Types.ObjectId(req.params.id);
}

function orgFilter(req, extra = {}) {
  return { organizationId: req.params.id, ...extra };
}

async function findOwned(Model, req, id) {
  return Model.findOne({ _id: id, organizationId: req.params.id });
}

/* ——— Branches ——— */
exports.listBranches = asyncHandler(async (req, res) => {
  const items = await Branch.find(orgFilter(req, { active: { $ne: false } })).limit(500).sort({ name: 1 });
  res.json({ success: true, data: { branches: items } });
});

exports.createBranch = asyncHandler(async (req, res) => {
  await loadOrg(req);
  const branch = await Branch.create({
    organizationId: req.params.id,
    ...pick(req.body, ['name', 'code', 'address', 'city', 'phone', 'active']),
  });
  res.status(201).json({ success: true, data: { branch } });
});

exports.updateBranch = asyncHandler(async (req, res) => {
  const branch = await findOwned(Branch, req, req.params.branchId);
  if (!branch) throw new AppError('Branch not found', 404);
  Object.assign(branch, pick(req.body, ['name', 'code', 'address', 'city', 'phone', 'active']));
  await branch.save();
  res.json({ success: true, data: { branch } });
});

exports.removeBranch = asyncHandler(async (req, res) => {
  const branch = await findOwned(Branch, req, req.params.branchId);
  if (!branch) throw new AppError('Branch not found', 404);
  branch.active = false;
  await branch.save();
  res.json({ success: true, message: 'Branch archived' });
});

/* ——— Departments ——— */
exports.listDepartments = asyncHandler(async (req, res) => {
  const filter = orgFilter(req, { active: { $ne: false } });
  if (req.query.branch) filter.branch = req.query.branch;
  const items = await Department.find(filter).limit(500).sort({ name: 1 });
  res.json({ success: true, data: { departments: items } });
});

exports.createDepartment = asyncHandler(async (req, res) => {
  await loadOrg(req);
  const dept = await Department.create({
    organizationId: req.params.id,
    ...pick(req.body, ['name', 'code', 'description', 'branch', 'headTeacher', 'active']),
  });
  res.status(201).json({ success: true, data: { department: dept } });
});

exports.updateDepartment = asyncHandler(async (req, res) => {
  const dept = await findOwned(Department, req, req.params.departmentId);
  if (!dept) throw new AppError('Department not found', 404);
  Object.assign(
    dept,
    pick(req.body, ['name', 'code', 'description', 'branch', 'headTeacher', 'active'])
  );
  await dept.save();
  res.json({ success: true, data: { department: dept } });
});

exports.removeDepartment = asyncHandler(async (req, res) => {
  const dept = await findOwned(Department, req, req.params.departmentId);
  if (!dept) throw new AppError('Department not found', 404);
  dept.active = false;
  await dept.save();
  res.json({ success: true, message: 'Department archived' });
});

/* ——— Academic years ——— */
exports.listAcademicYears = asyncHandler(async (req, res) => {
  const items = await AcademicYear.find(orgFilter(req)).limit(200).sort({ startDate: -1 });
  res.json({ success: true, data: { academicYears: items } });
});

exports.createAcademicYear = asyncHandler(async (req, res) => {
  await loadOrg(req);
  if (req.body.isCurrent) {
    await AcademicYear.updateMany(orgFilter(req), { $set: { isCurrent: false } });
  }
  const year = await AcademicYear.create({
    organizationId: req.params.id,
    ...pick(req.body, ['name', 'startDate', 'endDate', 'isCurrent', 'active']),
  });
  res.status(201).json({ success: true, data: { academicYear: year } });
});

exports.updateAcademicYear = asyncHandler(async (req, res) => {
  const year = await findOwned(AcademicYear, req, req.params.yearId);
  if (!year) throw new AppError('Academic year not found', 404);
  if (req.body.isCurrent) {
    await AcademicYear.updateMany(orgFilter(req), { $set: { isCurrent: false } });
  }
  Object.assign(year, pick(req.body, ['name', 'startDate', 'endDate', 'isCurrent', 'active']));
  await year.save();
  res.json({ success: true, data: { academicYear: year } });
});

exports.removeAcademicYear = asyncHandler(async (req, res) => {
  const year = await findOwned(AcademicYear, req, req.params.yearId);
  if (!year) throw new AppError('Academic year not found', 404);
  year.active = false;
  year.isCurrent = false;
  await year.save();
  res.json({ success: true, message: 'Academic year archived' });
});

/* ——— Semesters ——— */
exports.listSemesters = asyncHandler(async (req, res) => {
  const filter = orgFilter(req);
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  const items = await Semester.find(filter).limit(500).sort({ order: 1, startDate: 1 });
  res.json({ success: true, data: { semesters: items } });
});

exports.createSemester = asyncHandler(async (req, res) => {
  await loadOrg(req);
  const year = await findOwned(AcademicYear, req, req.body.academicYear);
  if (!year) throw new AppError('Academic year not found', 404);
  if (req.body.isCurrent) {
    await Semester.updateMany(orgFilter(req), { $set: { isCurrent: false } });
  }
  const semester = await Semester.create({
    organizationId: req.params.id,
    ...pick(req.body, ['academicYear', 'name', 'order', 'startDate', 'endDate', 'isCurrent', 'active']),
  });
  res.status(201).json({ success: true, data: { semester } });
});

exports.updateSemester = asyncHandler(async (req, res) => {
  const semester = await findOwned(Semester, req, req.params.semesterId);
  if (!semester) throw new AppError('Semester not found', 404);
  if (req.body.isCurrent) {
    await Semester.updateMany(orgFilter(req), { $set: { isCurrent: false } });
  }
  Object.assign(
    semester,
    pick(req.body, ['name', 'order', 'startDate', 'endDate', 'isCurrent', 'active'])
  );
  await semester.save();
  res.json({ success: true, data: { semester } });
});

exports.removeSemester = asyncHandler(async (req, res) => {
  const semester = await findOwned(Semester, req, req.params.semesterId);
  if (!semester) throw new AppError('Semester not found', 404);
  semester.active = false;
  semester.isCurrent = false;
  await semester.save();
  res.json({ success: true, message: 'Semester archived' });
});

/* ——— Courses ——— */
exports.listCourses = asyncHandler(async (req, res) => {
  const filter = orgFilter(req, { active: { $ne: false } });
  if (req.query.department) filter.department = req.query.department;
  const items = await Course.find(filter).limit(500).sort({ name: 1 });
  res.json({ success: true, data: { courses: items } });
});

exports.createCourse = asyncHandler(async (req, res) => {
  await loadOrg(req);
  const course = await Course.create({
    organizationId: req.params.id,
    ...pick(req.body, [
      'name',
      'code',
      'description',
      'department',
      'credits',
      'durationMonths',
      'active',
    ]),
  });
  res.status(201).json({ success: true, data: { course } });
});

exports.updateCourse = asyncHandler(async (req, res) => {
  const course = await findOwned(Course, req, req.params.courseId);
  if (!course) throw new AppError('Course not found', 404);
  Object.assign(
    course,
    pick(req.body, [
      'name',
      'code',
      'description',
      'department',
      'credits',
      'durationMonths',
      'active',
    ])
  );
  await course.save();
  res.json({ success: true, data: { course } });
});

exports.removeCourse = asyncHandler(async (req, res) => {
  const course = await findOwned(Course, req, req.params.courseId);
  if (!course) throw new AppError('Course not found', 404);
  course.active = false;
  await course.save();
  res.json({ success: true, message: 'Course archived' });
});

/* ——— Subjects ——— */
exports.listSubjects = asyncHandler(async (req, res) => {
  const filter = orgFilter(req, { active: { $ne: false } });
  if (req.query.course) filter.course = req.query.course;
  if (req.query.department) filter.department = req.query.department;
  const items = await Subject.find(filter).limit(500).sort({ name: 1 });
  res.json({ success: true, data: { subjects: items } });
});

exports.createSubject = asyncHandler(async (req, res) => {
  await loadOrg(req);
  const subject = await Subject.create({
    organizationId: req.params.id,
    ...pick(req.body, ['name', 'code', 'description', 'course', 'department', 'credits', 'active']),
  });
  res.status(201).json({ success: true, data: { subject } });
});

exports.updateSubject = asyncHandler(async (req, res) => {
  const subject = await findOwned(Subject, req, req.params.subjectId);
  if (!subject) throw new AppError('Subject not found', 404);
  Object.assign(
    subject,
    pick(req.body, ['name', 'code', 'description', 'course', 'department', 'credits', 'active'])
  );
  await subject.save();
  res.json({ success: true, data: { subject } });
});

exports.removeSubject = asyncHandler(async (req, res) => {
  const subject = await findOwned(Subject, req, req.params.subjectId);
  if (!subject) throw new AppError('Subject not found', 404);
  subject.active = false;
  await subject.save();
  res.json({ success: true, message: 'Subject archived' });
});

/* ——— Classes ——— */
exports.listClasses = asyncHandler(async (req, res) => {
  const filter = orgFilter(req, { active: { $ne: false } });
  if (req.query.department) filter.department = req.query.department;
  if (req.query.branch) filter.branch = req.query.branch;
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  const items = await ClassSection.find(filter)
    .limit(500)
    .populate('classTeacher', 'name email')
    .sort({ name: 1 });
  res.json({ success: true, data: { classes: items } });
});

exports.createClass = asyncHandler(async (req, res) => {
  await loadOrg(req);
  const klass = await ClassSection.create({
    organizationId: req.params.id,
    ...pick(req.body, [
      'name',
      'code',
      'branch',
      'department',
      'course',
      'academicYear',
      'semester',
      'classTeacher',
      'teachers',
      'students',
      'subjects',
      'capacity',
      'room',
      'active',
    ]),
  });
  res.status(201).json({ success: true, data: { class: klass } });
});

exports.updateClass = asyncHandler(async (req, res) => {
  const klass = await findOwned(ClassSection, req, req.params.classId);
  if (!klass) throw new AppError('Class not found', 404);
  Object.assign(
    klass,
    pick(req.body, [
      'name',
      'code',
      'branch',
      'department',
      'course',
      'academicYear',
      'semester',
      'classTeacher',
      'teachers',
      'students',
      'subjects',
      'capacity',
      'room',
      'active',
    ])
  );
  await klass.save();
  res.json({ success: true, data: { class: klass } });
});

exports.removeClass = asyncHandler(async (req, res) => {
  const klass = await findOwned(ClassSection, req, req.params.classId);
  if (!klass) throw new AppError('Class not found', 404);
  klass.active = false;
  await klass.save();
  res.json({ success: true, message: 'Class archived' });
});

exports.assignClassMembers = asyncHandler(async (req, res) => {
  const klass = await findOwned(ClassSection, req, req.params.classId);
  if (!klass) throw new AppError('Class not found', 404);
  const { addStudents, removeStudents, addTeachers, removeTeachers } = req.body;
  const toIds = (arr) => (Array.isArray(arr) ? arr.map(String) : []);
  if (addStudents?.length) {
    const set = new Set(klass.students.map(String));
    toIds(addStudents).forEach((id) => set.add(id));
    klass.students = [...set];
  }
  if (removeStudents?.length) {
    const drop = new Set(toIds(removeStudents));
    klass.students = klass.students.filter((id) => !drop.has(String(id)));
  }
  if (addTeachers?.length) {
    const set = new Set(klass.teachers.map(String));
    toIds(addTeachers).forEach((id) => set.add(id));
    klass.teachers = [...set];
  }
  if (removeTeachers?.length) {
    const drop = new Set(toIds(removeTeachers));
    klass.teachers = klass.teachers.filter((id) => !drop.has(String(id)));
  }
  await klass.save();
  res.json({ success: true, data: { class: klass } });
});

/* ——— Timetable ——— */
exports.listTimetable = asyncHandler(async (req, res) => {
  const filter = orgFilter(req);
  if (req.query.classSection) filter.classSection = req.query.classSection;
  if (req.query.dayOfWeek) filter.dayOfWeek = req.query.dayOfWeek;
  const entries = await TimetableEntry.find(filter)
    .limit(500)
    .populate('subject', 'name code')
    .populate('teacher', 'name email')
    .sort({ dayOfWeek: 1, startTime: 1 });
  res.json({ success: true, data: { entries } });
});

exports.createTimetableEntry = asyncHandler(async (req, res) => {
  const klass = await findOwned(ClassSection, req, req.body.classSection);
  if (!klass) throw new AppError('Class not found', 404);
  const entry = await TimetableEntry.create({
    organizationId: req.params.id,
    ...pick(req.body, [
      'classSection',
      'subject',
      'teacher',
      'dayOfWeek',
      'startTime',
      'endTime',
      'room',
      'notes',
    ]),
  });
  res.status(201).json({ success: true, data: { entry } });
});

exports.updateTimetableEntry = asyncHandler(async (req, res) => {
  const entry = await findOwned(TimetableEntry, req, req.params.entryId);
  if (!entry) throw new AppError('Timetable entry not found', 404);
  Object.assign(
    entry,
    pick(req.body, ['subject', 'teacher', 'dayOfWeek', 'startTime', 'endTime', 'room', 'notes'])
  );
  await entry.save();
  res.json({ success: true, data: { entry } });
});

exports.removeTimetableEntry = asyncHandler(async (req, res) => {
  const entry = await findOwned(TimetableEntry, req, req.params.entryId);
  if (!entry) throw new AppError('Timetable entry not found', 404);
  await entry.deleteOne();
  res.json({ success: true, message: 'Timetable entry deleted' });
});

/* ——— Attendance ——— */
exports.listAttendance = asyncHandler(async (req, res) => {
  const filter = orgFilter(req);
  if (req.query.classSection) filter.classSection = req.query.classSection;
  if (req.query.student) filter.student = req.query.student;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }
  const records = await AttendanceRecord.find(filter)
    .sort({ date: -1 })
    .limit(Math.min(Number(req.query.limit) || 200, 500));
  res.json({ success: true, data: { records } });
});

exports.markAttendance = asyncHandler(async (req, res) => {
  const klass = await findOwned(ClassSection, req, req.body.classSection);
  if (!klass) throw new AppError('Class not found', 404);
  const date = new Date(req.body.date || new Date());
  date.setHours(0, 0, 0, 0);
  const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
  if (!entries.length) throw new AppError('Attendance entries required', 400);

  const results = [];
  for (const e of entries) {
    if (!e.student) continue;
    const record = await AttendanceRecord.findOneAndUpdate(
      {
        organizationId: req.params.id,
        classSection: klass._id,
        student: e.student,
        date,
        subject: e.subject || null,
      },
      {
        $set: {
          status: e.status || 'present',
          notes: e.notes || '',
          markedBy: req.user._id,
          subject: e.subject || null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    results.push(record);
  }
  res.status(201).json({ success: true, data: { records: results } });
});

exports.attendanceSummary = asyncHandler(async (req, res) => {
  const filter = { organizationId: orgObjectId(req) };
  if (req.query.classSection) {
    const raw = String(req.query.classSection);
    if (!mongoose.Types.ObjectId.isValid(raw)) {
      throw new AppError('Invalid classSection', 400);
    }
    filter.classSection = new mongoose.Types.ObjectId(raw);
  }
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }
  const summary = await AttendanceRecord.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);
  const byStatus = Object.fromEntries(summary.map((s) => [s._id, s.count]));
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const present = (byStatus.present || 0) + (byStatus.late || 0);
  res.json({
    success: true,
    data: {
      total,
      byStatus,
      presentRate: total ? Math.round((present / total) * 100) : 0,
    },
  });
});
