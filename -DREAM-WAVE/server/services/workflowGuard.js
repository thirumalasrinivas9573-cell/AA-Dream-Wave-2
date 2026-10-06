const { PROTECTED_TASK_FIELDS } = require('../config/progression')

/**
 * Checks whether a task has the progression workflow enabled.
 * @param {Object} task
 * @returns {boolean}
 */
function isWorkflowTask(task) {
  return Boolean(task && task.workflowEnabled)
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
  assertCompletionAllowed,
  stripProtectedFields,
}
