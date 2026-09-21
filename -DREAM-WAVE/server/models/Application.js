const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: ['job', 'internship', 'admission'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile' },
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
  status: { type: String, enum: ['pending', 'reviewing', 'shortlisted', 'interview', 'accepted', 'rejected', 'withdrawn'], default: 'pending' },
  coverLetter: { type: String, default: '' },
  resumeUrl: { type: String, default: '' },
  resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'shortlisted', 'interview', 'accepted', 'rejected', 'withdrawn'],
      required: true,
    },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, maxlength: 500, default: '' },
  }],
  notes: { type: String, default: '' },
}, { timestamps: true });

applicationSchema.index({ studentId: 1, targetType: 1, targetId: 1 }, { unique: true });
applicationSchema.index({ studentId: 1, status: 1, updatedAt: -1 });

applicationSchema.pre('save', async function captureStatusChange(next) {
  try {
    this.$locals.wasNew = this.isNew
    if (!this.isNew && this.isModified('status')) {
      const previous = await this.constructor.findById(this._id).select('status').lean()
      this.$locals.previousStatus = previous?.status
      if (!this.statusHistory?.some((entry) => entry.status === this.status && Math.abs(Date.now() - new Date(entry.changedAt).getTime()) < 5000)) {
        this.statusHistory.push({ status: this.status })
      }
    }
    next()
  } catch (error) {
    next(error)
  }
})

applicationSchema.post('save', async function notifyStudent(application) {
  if (!application.$locals.wasNew && !application.$locals.previousStatus) return
  if (!application.$locals.wasNew && application.$locals.previousStatus === application.status) return
  if (!['job', 'internship'].includes(application.targetType)) return
  try {
    const notificationService = require('../services/notificationService')
    const labels = {
      pending: 'Application submitted',
      reviewing: 'Application under review',
      shortlisted: 'You have been shortlisted',
      interview: 'Interview invitation',
      accepted: 'Offer received',
      rejected: 'Application update',
      withdrawn: 'Application withdrawn',
    }
    await notificationService.createForUser(application.studentId, {
      type: application.targetType,
      channel: 'in-app',
      title: labels[application.status] || 'Application update',
      body: `Your ${application.targetType} application is now ${application.status}.`,
      link: '/student/career/applications',
      meta: { applicationId: application._id, targetId: application.targetId, status: application.status },
      source: 'career-applications',
      dedupeKey: `application:${application._id}:${application.status}`,
    })
  } catch {
    // Application persistence must not fail if notification delivery is unavailable.
  }
})

applicationSchema.pre('findOneAndUpdate', async function captureQueryStatusChange(next) {
  try {
    const update = this.getUpdate() || {}
    const nextStatus = update.status || update.$set?.status
    if (!nextStatus) return next()
    const previous = await this.model.findOne(this.getQuery()).select('status studentId targetType targetId').lean()
    this._careerPreviousApplication = previous
    this._careerNextStatus = nextStatus
    if (previous && previous.status !== nextStatus) {
      this.setUpdate({
        ...update,
        $push: {
          ...(update.$push || {}),
          statusHistory: { status: nextStatus, changedAt: new Date() },
        },
      })
    }
    return next()
  } catch (error) {
    return next(error)
  }
})

applicationSchema.post('findOneAndUpdate', async function notifyQueryStatusChange() {
  const previous = this._careerPreviousApplication
  const status = this._careerNextStatus
  if (!previous || previous.status === status || !['job', 'internship'].includes(previous.targetType)) return
  try {
    const notificationService = require('../services/notificationService')
    const labels = {
      reviewing: 'Application under review',
      shortlisted: 'You have been shortlisted',
      interview: 'Interview invitation',
      accepted: 'Offer received',
      rejected: 'Application update',
      withdrawn: 'Application withdrawn',
    }
    await notificationService.createForUser(previous.studentId, {
      type: previous.targetType,
      channel: 'in-app',
      title: labels[status] || 'Application update',
      body: `Your ${previous.targetType} application is now ${status}.`,
      link: '/student/career/applications',
      meta: { targetId: previous.targetId, status },
      source: 'career-applications',
      dedupeKey: `application:${previous._id}:${status}`,
    })
  } catch {
    // Hiring updates must not fail when notification delivery is unavailable.
  }
})

module.exports = mongoose.model('Application', applicationSchema);
