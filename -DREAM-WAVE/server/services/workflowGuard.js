const { PROTECTED_TASK_FIELDS } = require('../config/progression')

/**
 * Checks whether a task has the progression workflow enabled.
 * @param {Object} task
 * @returns {boolean}
 */
function isWorkflowTask(task) {
  return Boolean(task && task.workflowEnabled)
}

function isCompletedWorkflowTask(task) {
  if (!isWorkflowTask(task)) return false
  return Boolean(
    task.completed === true ||
    task.status === 'completed' ||
    task.stageStatus === 'task_completed' ||
    task.progressionStage === 'completed'
  )
}

/**
 * Checks whether an incoming update is an attempt to reopen a completed workflow task.
 * @param {Object} task
 * @param {Object} updates
 * @returns {boolean}
 */
function isWorkflowReopenAttempt(task, updates = {}) {
  if (!isCompletedWorkflowTask(task)) return false

  // 1. Explicit completed: false
  if (updates.completed === false) return true

  // 2. Setting status to a non-completed, non-archived state
  if (updates.status !== undefined && !['completed', 'archived'].includes(updates.status)) {
    return true
  }

  // 3. Lowering progress below 100
  if (updates.progress !== undefined && Number(updates.progress) < 100) {
    return true
  }

  // 4. Subtasks un-complete: any subtask with completed: false
  if (Array.isArray(updates.subtasks)) {
    if (updates.subtasks.some((s) => s && s.completed === false)) {
      return true
    }
  }

  // 5. Checklist un-complete: any checklist item with done: false
  if (Array.isArray(updates.checklist)) {
    if (updates.checklist.some((c) => c && c.done === false)) {
      return true
    }
  }

  return false
}

/**
 * Enforces that workflow tasks cannot be marked complete or reopened through legacy endpoints.
 * @param {Object} task
 * @param {string} action
 * @throws {Error} HTTP 403 with code 'WORKFLOW_ENFORCED'
 */
function assertCompletionAllowed(task, action = 'complete') {
  if (isWorkflowTask(task)) {
    const error = new Error('This task is completed through Learning, Exam and Certification.')
    error.statusCode = 403
    error.code = 'WORKFLOW_ENFORCED'
    error.success = false
    throw error
  }
}

/**
 * Mass-assignment protection:
 * Strips internal workflow progression fields and server-managed metrics from
 * client request payloads so clients cannot arbitrarily inject state changes or
 * bypass the Learning -> Exam -> Certification pipeline.
 *
 * @param {Object} body
 * @returns {Object} A shallow copy of body with protected keys stripped
 */
function stripProtectedFields(body = {}) {
  if (!body || typeof body !== 'object') return {}
  const sanitized = { ...body }
  for (const field of PROTECTED_TASK_FIELDS) {
    delete sanitized[field]
  }
  return sanitized
}

module.exports = {
  isWorkflowTask,
  isCompletedWorkflowTask,
  isWorkflowReopenAttempt,
  assertCompletionAllowed,
  stripProtectedFields,
}

