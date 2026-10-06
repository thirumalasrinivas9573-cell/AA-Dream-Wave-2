const crypto = require('crypto')
const Task = require('../models/Task')
const TaskExam = require('../models/TaskExam')
const TaskCertificate = require('../models/TaskCertificate')
const Resume = require('../models/Resume')
const StudentProfile = require('../models/StudentProfile')
const { CERTIFICATE_ISSUER } = require('../config/progression')
const {
  createProgressionError,
  getProgressionState,
} = require('./taskProgressionService')

/**
 * Issues a persistent, idempotent certificate for a task after a passing exam.
 * Title is frozen from the snapshot taken at enable time.
 */
async function issueCertificate(taskId, userId) {
  const task = await Task.findOne({ _id: taskId, userId })
  if (!task) {
    throw createProgressionError('Task not found.', 'TASK_NOT_FOUND', 404)
  }

  if (!task.workflowEnabled) {
    throw createProgressionError(
      'Task progression workflow is not enabled for this task.',
      'WORKFLOW_NOT_ENABLED',
      400,
    )
  }

  const allowedStatuses = [
    'exam_passed',
    'certification_locked',
    'certification_completed',
    'task_completed',
  ]
  if (!allowedStatuses.includes(task.stageStatus)) {
    throw createProgressionError(
      'Task is not eligible for certification. Exam must be passed first.',
      'CERTIFICATION_NOT_ELIGIBLE',
      409,
    )
  }

  // Verify passing attempt from trusted TaskExam persisted data
  const exam = await TaskExam.findOne({ taskId: task._id, userId })
  const hasPassingAttempt =
    Array.isArray(exam?.attempts) && exam.attempts.some((a) => a.passed === true)

  if (!hasPassingAttempt) {
    throw createProgressionError(
      'Task is not eligible for certification. A verified passing exam attempt is required.',
      'CERTIFICATION_NOT_ELIGIBLE',
      409,
    )
  }

  // Idempotent: return existing certificate if one was already issued
  let existingCert = await TaskCertificate.findOne({ userId, taskId: task._id })
  if (existingCert) {
    if (task.stageStatus === 'exam_passed') {
      await Task.findOneAndUpdate(
        { _id: task._id, userId, stageStatus: 'exam_passed' },
        {
          $set: {
            stageStatus: 'certification_locked',
            certificateId: existingCert.credentialId,
            progressionStage: 'certification',
          },
        },
      )
    } else if (!task.certificateId) {
      await Task.updateOne(
        { _id: task._id, userId },
        { $set: { certificateId: existingCert.credentialId } },
      )
    }
    return existingCert
  }

  // Generate cryptographically random credentialId
  const randomSuffix = crypto.randomBytes(6).toString('hex').toUpperCase()
  const credentialId = `DW-CERT-${randomSuffix}`

  const skills = []
  if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
    skills.push(
      ...task.subtasks
        .map((s) => (typeof s?.title === 'string' ? s.title.trim() : ''))
        .filter(Boolean),
    )
  }

  const frozenTitle = (
    task.learningSnapshot?.title ||
    task.title ||
    'Technical Milestone'
  ).slice(0, 200)

  let certificate
  try {
    certificate = await TaskCertificate.create({
      credentialId,
      taskId: task._id,
      userId,
      title: frozenTitle,
      category: 'course',
      issuer: CERTIFICATE_ISSUER,
      issueDate: new Date(),
      verificationUrl: '',
      skills,
      linkedToResume: false,
      linkedResumeIds: [],
    })
  } catch (err) {
    if (err.code === 11000) {
      // Concurrent insert won the race; fetch the existing certificate
      certificate = await TaskCertificate.findOne({ userId, taskId: task._id })
      if (!certificate) {
        throw createProgressionError(
          'Failed to generate certificate due to duplicate key conflict.',
          'CERTIFICATE_GENERATION_FAILED',
          500,
          { recoverable: true },
        )
      }
    } else {
      throw createProgressionError(
        'Failed to generate certificate.',
        'CERTIFICATE_GENERATION_FAILED',
        500,
        { recoverable: true },
      )
    }
  }

  // Move task status to certification_locked if coming from exam_passed
  if (task.stageStatus === 'exam_passed') {
    await Task.findOneAndUpdate(
      { _id: task._id, userId, stageStatus: 'exam_passed' },
      {
        $set: {
          stageStatus: 'certification_locked',
          certificateId: certificate.credentialId,
          progressionStage: 'certification',
        },
      },
    )
  } else if (!task.certificateId) {
    await Task.updateOne(
      { _id: task._id, userId },
      { $set: { certificateId: certificate.credentialId } },
    )
  }

  return certificate
}

/**
 * Links a task certificate into StudentProfile.credentials (always)
 * and attaches to exactly ONE resume (primary/default if exists, otherwise most recently updated).
 * Uses real schema names and triggers Resume revision bump.
 */
async function linkCertificateToResume(taskId, userId) {
  const task = await Task.findOne({ _id: taskId, userId })
  if (!task) {
    throw createProgressionError('Task not found.', 'TASK_NOT_FOUND', 404)
  }

  if (!task.workflowEnabled) {
    throw createProgressionError(
      'Task progression workflow is not enabled for this task.',
      'WORKFLOW_NOT_ENABLED',
      400,
    )
  }

  const certificate = await TaskCertificate.findOne({ taskId: task._id, userId })
  if (!certificate) {
    throw createProgressionError(
      'Certificate not found for this task. Issue certificate first.',
      'CERTIFICATION_NOT_ELIGIBLE',
      409,
    )
  }

  try {
    // 1. Always upsert into StudentProfile.credentials, deduped by credentialId
    let studentProfile = await StudentProfile.findOne({ userId })
    if (!studentProfile) {
      // Create minimal default profile if not yet created
      studentProfile = new StudentProfile({
        userId,
        username: 'student-' + String(userId).slice(-8),
        credentials: [],
      })
    }

    const existingCredIndex = (studentProfile.credentials || []).findIndex(
      (c) => c.credentialId === certificate.credentialId,
    )

    const profileCredData = {
      title: certificate.title,
      category: certificate.category || 'course',
      issuer: certificate.issuer || CERTIFICATE_ISSUER,
      credentialId: certificate.credentialId,
      verificationUrl: certificate.verificationUrl || '',
      documentUrl: '',
      skills: certificate.skills || [],
      issuedAt: certificate.issueDate || new Date(),
      verificationStatus: 'verified',
      visibility: 'public',
    }

    if (existingCredIndex >= 0) {
      Object.assign(studentProfile.credentials[existingCredIndex], profileCredData)
    } else {
      studentProfile.credentials.push(profileCredData)
    }
    await studentProfile.save()

    // 2. Attach to exactly ONE resume:
    // Primary/default resume if exists, otherwise the most recently updated
    const resumes = await Resume.find({ userId })
    let targetResume =
      resumes.find((r) => r.isDefault) ||
      [...resumes].sort(
        (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt),
      )[0] ||
      null

    let linkedResumeId = null
    if (targetResume) {
      const alreadyInResume =
        Array.isArray(targetResume.certifications) &&
        targetResume.certifications.some((c) => c.credentialId === certificate.credentialId)

      if (!alreadyInResume) {
        targetResume.certifications.push({
          title: certificate.title,
          issuer: certificate.issuer || CERTIFICATE_ISSUER,
          issuedAt: certificate.issueDate
            ? new Date(certificate.issueDate).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          credentialId: certificate.credentialId,
          url: certificate.verificationUrl || '',
        })
        targetResume.revision = (Number(targetResume.revision) || 1) + 1
        targetResume.lastAutosavedAt = new Date()
        await targetResume.save()
      }
      linkedResumeId = targetResume._id.toString()
    }

    // 3. Update TaskCertificate
    certificate.linkedToResume = true // present in profile credentials
    certificate.linkedResumeId = linkedResumeId
    certificate.linkedResumeIds = linkedResumeId ? [linkedResumeId] : []
    await certificate.save()

    // 4. Update Task stageStatus certification_locked -> certification_completed
    await Task.findOneAndUpdate(
      {
        _id: task._id,
        userId,
        stageStatus: { $in: ['certification_locked', 'certification_completed', 'exam_passed'] },
      },
      {
        $set: {
          stageStatus: 'certification_completed',
          resumeLinkedAt: task.resumeLinkedAt || new Date(),
          progressionStage: 'certification',
        },
      },
    )

    return certificate
  } catch (err) {
    throw createProgressionError(
      'Failed to link certificate to Resume Builder.',
      'RESUME_LINK_FAILED',
      500,
      { recoverable: true, originalError: err.message },
    )
  }
}

/**
 * Finalizes task completion after both certificate generation and resume linkage are verified.
 */
async function finalizeTask(taskId, userId) {
  const task = await Task.findOne({ _id: taskId, userId })
  if (!task) {
    throw createProgressionError('Task not found.', 'TASK_NOT_FOUND', 404)
  }

  if (!task.workflowEnabled) {
    throw createProgressionError(
      'Task progression workflow is not enabled for this task.',
      'WORKFLOW_NOT_ENABLED',
      400,
    )
  }

  const missing = []

  if (task.completed && task.stageStatus === 'task_completed') {
    return task
  }

  const exam = await TaskExam.findOne({ taskId: task._id, userId })
  const hasPassingAttempt =
    Array.isArray(exam?.attempts) && exam.attempts.some((a) => a.passed === true)
  if (!hasPassingAttempt) {
    missing.push('A verified passing exam attempt is required.')
  }

  const certificate = await TaskCertificate.findOne({ taskId: task._id, userId })
  if (!certificate) {
    missing.push('Certificate must be issued.')
  } else if (!certificate.linkedToResume) {
    missing.push('Certificate must be linked to Resume Builder.')
  }

  if (missing.length > 0) {
    throw createProgressionError(
      `Task cannot be completed yet. Missing requirements: ${missing.join(' ')}`,
      'FINALIZATION_NOT_ALLOWED',
      409,
      { missing },
    )
  }

  const completedTask = await Task.findOneAndUpdate(
    {
      _id: task._id,
      userId,
      workflowEnabled: true,
      stageStatus: 'certification_completed',
    },
    {
      $set: {
        completed: true,
        status: 'completed',
        completedAt: new Date(),
        progress: 100,
        progressionStage: 'completed',
        stageStatus: 'task_completed',
        certificationLastError: null,
      },
    },
    { new: true },
  )

  if (!completedTask) {
    const current = await Task.findOne({ _id: task._id, userId })
    if (current?.stageStatus === 'task_completed') {
      return current
    }
    throw createProgressionError(
      `Concurrent transition prevented task finalization. Current status is '${current?.stageStatus}'.`,
      'FINALIZATION_NOT_ALLOWED',
      409,
    )
  }

  return completedTask
}

/**
 * Self-healing orchestration pipeline.
 * Sets certificationLastError on recoverable error, clears it on success.
 */
async function completeCertificationPipeline(taskId, userId) {
  try {
    const certificate = await issueCertificate(taskId, userId)
    const linkedCertificate = await linkCertificateToResume(taskId, userId)
    const finalizedTask = await finalizeTask(taskId, userId)

    // Clear any previous error on task
    await Task.updateOne(
      { _id: taskId, userId },
      { $set: { certificationLastError: null } },
    )

    const progressionState = await getProgressionState(taskId, userId)

    return {
      task: finalizedTask,
      progressionState,
      certificate: {
        credentialId: linkedCertificate.credentialId,
        title: linkedCertificate.title,
        issuedAt: linkedCertificate.issueDate,
        linkedToResume: linkedCertificate.linkedToResume,
      },
    }
  } catch (err) {
    // Record recoverable error on task
    await Task.updateOne(
      { _id: taskId, userId },
      {
        $set: {
          certificationLastError: {
            code: err.code || 'CERTIFICATION_FAILED',
            message: err.message,
            at: new Date(),
          },
        },
      },
    )
    throw err
  }
}

module.exports = {
  issueCertificate,
  linkCertificateToResume,
  finalizeTask,
  completeCertificationPipeline,
}
