/**
 * Central Error Mapper for Task Progression & Certification Workflow.
 * Maps API errors (HTTP status, error codes, and metadata) to user-facing messages and actions.
 *
 * Authoritative reference: server/docs/task-progression-api.md
 */

export const PROGRESSION_ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  SESSION_INVALID: 'SESSION_INVALID',
  FORBIDDEN: 'FORBIDDEN',
  WORKFLOW_ENFORCED: 'WORKFLOW_ENFORCED',
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  WORKFLOW_NOT_ENABLED: 'WORKFLOW_NOT_ENABLED',
  INVALID_ID: 'INVALID_ID',
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_ANSWERS: 'INVALID_ANSWERS',
  LEARNING_INCOMPLETE: 'LEARNING_INCOMPLETE',
  EXAM_NOT_ACTIVE: 'EXAM_NOT_ACTIVE',
  EXAM_EXPIRED: 'EXAM_EXPIRED',
  EXAM_ALREADY_PASSED: 'EXAM_ALREADY_PASSED',
  ILLEGAL_STAGE_TRANSITION: 'ILLEGAL_STAGE_TRANSITION',
  CERTIFICATION_NOT_ELIGIBLE: 'CERTIFICATION_NOT_ELIGIBLE',
  FINALIZATION_NOT_ALLOWED: 'FINALIZATION_NOT_ALLOWED',
  TASK_ALREADY_COMPLETED: 'TASK_ALREADY_COMPLETED',
  EXAM_GENERATION_FAILED: 'EXAM_GENERATION_FAILED',
  CERTIFICATE_GENERATION_FAILED: 'CERTIFICATE_GENERATION_FAILED',
  RESUME_LINK_FAILED: 'RESUME_LINK_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  ACTIVE_FOCUS_SESSION_EXISTS: 'ACTIVE_FOCUS_SESSION_EXISTS',
  REVISION_CONFLICT: 'REVISION_CONFLICT',
};

export const ERROR_ACTIONS = {
  AUTH: 'auth',
  REFETCH_PROGRESSION: 'refetch_progression',
  RETRY: 'retry',
  RATE_LIMITED: 'rate_limited',
  FOCUS_MESSAGE: 'focus_message',
  RELOAD_RESUME: 'reload_resume',
  NETWORK_RETRY: 'network_retry',
  NONE: 'none',
};

/**
 * Maps an API error to a structured progression error object.
 * @param {object|Error} error - Axios error or generic error
 * @returns {object} { code, status, friendlyMessage, action, requirements, missing, retryAfter, isRecoverable }
 */
export function mapProgressionError(error) {
  if (!error) {
    return {
      code: 'UNKNOWN',
      status: 500,
      friendlyMessage: 'An unexpected error occurred.',
      action: ERROR_ACTIONS.NONE,
      requirements: [],
      missing: [],
      isRecoverable: false,
    };
  }

  // Network / Offline errors
  if (error.isNetworkError || !error.response) {
    return {
      code: 'NETWORK_ERROR',
      status: 0,
      friendlyMessage: 'Network connection error. Please check your internet connection and try again.',
      action: ERROR_ACTIONS.NETWORK_RETRY,
      requirements: [],
      missing: [],
      isRecoverable: true,
    };
  }

  const status = error.response.status;
  const data = error.response.data || {};
  const code = data.code || error.apiCode || '';
  const serverMessage = data.message || error.userMessage || '';

  // 1. Authentication errors (401)
  if (
    status === 401 ||
    code === PROGRESSION_ERROR_CODES.AUTH_REQUIRED ||
    code === PROGRESSION_ERROR_CODES.TOKEN_INVALID ||
    code === PROGRESSION_ERROR_CODES.SESSION_INVALID
  ) {
    return {
      code: code || 'AUTH_REQUIRED',
      status: 401,
      friendlyMessage: 'Your session has expired. Please sign in again.',
      action: ERROR_ACTIONS.AUTH,
      requirements: [],
      missing: [],
      isRecoverable: false,
    };
  }

  // 2. Authorization: Workflow Enforced (403)
  if (code === PROGRESSION_ERROR_CODES.WORKFLOW_ENFORCED) {
    return {
      code,
      status: 403,
      friendlyMessage:
        'Direct task completion is not allowed. Complete the Learning, Exam, and Certification stages to complete this task.',
      action: ERROR_ACTIONS.NONE,
      requirements: [],
      missing: [],
      isRecoverable: false,
    };
  }

  // 3. Authorization: Forbidden (403)
  if (status === 403 || code === PROGRESSION_ERROR_CODES.FORBIDDEN) {
    return {
      code: code || 'FORBIDDEN',
      status: 403,
      friendlyMessage: 'You do not have permission to access or modify this task.',
      action: ERROR_ACTIONS.NONE,
      requirements: [],
      missing: [],
      isRecoverable: false,
    };
  }

  // 4. Rate Limited (429) on exam start
  if (
    status === 429 ||
    code === PROGRESSION_ERROR_CODES.RATE_LIMITED
  ) {
    let retryAfter = 60;
    const retryHeader = error.response?.headers?.['retry-after'];
    if (retryHeader) {
      const parsed = parseInt(retryHeader, 10);
      if (!isNaN(parsed) && parsed > 0) {
        retryAfter = parsed;
      }
    }
    return {
      code: PROGRESSION_ERROR_CODES.RATE_LIMITED,
      status: 429,
      friendlyMessage: serverMessage || 'Too many exam start attempts. Please wait before retrying.',
      action: ERROR_ACTIONS.RATE_LIMITED,
      retryAfter,
      requirements: [],
      missing: [],
      isRecoverable: false,
    };
  }

  // 5. Active Focus Session Exists (409) - NOT a stage conflict, do NOT refetch /progression
  if (code === PROGRESSION_ERROR_CODES.ACTIVE_FOCUS_SESSION_EXISTS) {
    return {
      code,
      status: 409,
      friendlyMessage: 'Stop your current focus session first.',
      action: ERROR_ACTIONS.FOCUS_MESSAGE,
      requirements: [],
      missing: [],
      isRecoverable: false,
    };
  }

  // 6. Revision Conflict in Resume Builder (409)
  if (code === PROGRESSION_ERROR_CODES.REVISION_CONFLICT) {
    return {
      code,
      status: 409,
      friendlyMessage: 'Resume changed in another session. Reloading the latest version.',
      action: ERROR_ACTIONS.RELOAD_RESUME,
      requirements: [],
      missing: [],
      isRecoverable: false,
    };
  }

  // 7. Learning Incomplete (400)
  if (code === PROGRESSION_ERROR_CODES.LEARNING_INCOMPLETE) {
    return {
      code,
      status: 400,
      friendlyMessage:
        serverMessage || 'Complete learning stage requirements to unlock exam.',
      action: ERROR_ACTIONS.NONE,
      requirements: Array.isArray(data.requirements) ? data.requirements : [],
      missing: [],
      isRecoverable: false,
    };
  }

  // 8. Task Not Found (404)
  if (status === 404 && (!code || code === PROGRESSION_ERROR_CODES.TASK_NOT_FOUND)) {
    return {
      code: code || 'TASK_NOT_FOUND',
      status: 404,
      friendlyMessage: 'Task was not found or has been removed.',
      action: ERROR_ACTIONS.NONE,
      requirements: [],
      missing: [],
      isRecoverable: false,
    };
  }

  // 9. Bad Input / Workflow Not Enabled (400)
  if (code === PROGRESSION_ERROR_CODES.WORKFLOW_NOT_ENABLED) {
    return {
      code,
      status: 400,
      friendlyMessage: 'Task progression workflow is not enabled for this task.',
      action: ERROR_ACTIONS.NONE,
      requirements: [],
      missing: [],
      isRecoverable: false,
    };
  }

  if (
    code === PROGRESSION_ERROR_CODES.INVALID_ID ||
    code === PROGRESSION_ERROR_CODES.INVALID_INPUT ||
    code === PROGRESSION_ERROR_CODES.INVALID_ANSWERS
  ) {
    return {
      code,
      status: 400,
      friendlyMessage: serverMessage || 'Invalid request parameters or answers provided.',
      action: ERROR_ACTIONS.NONE,
      requirements: [],
      missing: [],
      isRecoverable: false,
    };
  }

  // 10. Recoverable Pipeline Errors (500)
  if (
    code === PROGRESSION_ERROR_CODES.EXAM_GENERATION_FAILED ||
    code === PROGRESSION_ERROR_CODES.CERTIFICATE_GENERATION_FAILED ||
    code === PROGRESSION_ERROR_CODES.RESUME_LINK_FAILED ||
    (status === 500 && data.recoverableError)
  ) {
    return {
      code: code || 'GENERATION_FAILED',
      status: 500,
      friendlyMessage:
        serverMessage || data.recoverableError?.message || 'Processing encountered a recoverable issue. Please retry.',
      action: ERROR_ACTIONS.RETRY,
      requirements: [],
      missing: [],
      isRecoverable: true,
    };
  }

  // 11. Stage Conflicts / Mismatches that require refetching /progression
  // EXAM_NOT_ACTIVE (404/409), EXAM_EXPIRED (400), EXAM_ALREADY_PASSED (400),
  // ILLEGAL_STAGE_TRANSITION (409), CERTIFICATION_NOT_ELIGIBLE (409),
  // FINALIZATION_NOT_ALLOWED (409), TASK_ALREADY_COMPLETED (409)
  const progressionSyncCodes = {
    [PROGRESSION_ERROR_CODES.EXAM_NOT_ACTIVE]:
      'Exam session is no longer active. Refreshing progression state.',
    [PROGRESSION_ERROR_CODES.EXAM_EXPIRED]:
      'Exam session has expired. Rolling back to Learning stage.',
    [PROGRESSION_ERROR_CODES.EXAM_ALREADY_PASSED]:
      'This exam has already been passed.',
    [PROGRESSION_ERROR_CODES.ILLEGAL_STAGE_TRANSITION]:
      'Stage transition mismatch. Synchronizing latest state from server.',
    [PROGRESSION_ERROR_CODES.CERTIFICATION_NOT_ELIGIBLE]:
      'You must pass the exam before receiving a certificate.',
    [PROGRESSION_ERROR_CODES.FINALIZATION_NOT_ALLOWED]:
      `Task cannot be completed yet. Missing requirements: ${(data.missing || []).join(', ') || 'unmet criteria'}.`,
    [PROGRESSION_ERROR_CODES.TASK_ALREADY_COMPLETED]:
      'This task is already completed.',
  };

  if (progressionSyncCodes[code] || (status === 409 && code !== PROGRESSION_ERROR_CODES.ACTIVE_FOCUS_SESSION_EXISTS && code !== PROGRESSION_ERROR_CODES.REVISION_CONFLICT)) {
    return {
      code: code || 'STAGE_CONFLICT',
      status,
      friendlyMessage: progressionSyncCodes[code] || serverMessage || 'State conflict detected. Refreshing progression state.',
      action: ERROR_ACTIONS.REFETCH_PROGRESSION,
      requirements: [],
      missing: Array.isArray(data.missing) ? data.missing : [],
      isRecoverable: false,
    };
  }

  // Fallback default
  return {
    code: code || 'SERVER_ERROR',
    status,
    friendlyMessage: serverMessage || 'An unexpected error occurred.',
    action: ERROR_ACTIONS.NONE,
    requirements: [],
    missing: [],
    isRecoverable: false,
  };
}
