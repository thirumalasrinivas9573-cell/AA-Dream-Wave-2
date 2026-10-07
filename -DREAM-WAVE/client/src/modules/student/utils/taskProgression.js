/**
 * Stage-state-to-UI mapping and constants for Task Progression workflow.
 * Single source of truth for stage names, state labels, icons, and badges.
 */

export const STAGE_STATES = {
  LOCKED: 'locked',
  CURRENT: 'current',
  READY_FOR_VERIFICATION: 'ready_for_verification',
  COMPLETED: 'completed',
  FAILED: 'failed',
  GENERATING: 'generating',
};

export const STAGE_DEFINITIONS = [
  { id: 'learning', label: 'Learning', stepNumber: 1 },
  { id: 'exam', label: 'Exam', stepNumber: 2 },
  { id: 'certification', label: 'Certification', stepNumber: 3 },
];

export const STAGE_STATE_MAP = {
  locked: {
    state: 'locked',
    label: 'Locked',
    icon: '🔒',
    ariaLabel: 'Stage is locked',
    badgeClass: 'stage-state--locked',
    description: 'Prerequisites must be completed to unlock this stage.',
  },
  current: {
    state: 'current',
    label: 'In Progress',
    icon: '⏳',
    ariaLabel: 'Stage is in progress',
    badgeClass: 'stage-state--current',
    description: 'This stage is currently active.',
  },
  ready_for_verification: {
    state: 'ready_for_verification',
    label: 'Ready to Unlock',
    icon: '🔓',
    ariaLabel: 'Stage is ready for verification to unlock exam',
    badgeClass: 'stage-state--ready',
    description: 'Learning requirements are met. Ready to verify and unlock exam.',
  },
  completed: {
    state: 'completed',
    label: 'Completed',
    icon: '✓',
    ariaLabel: 'Stage is completed',
    badgeClass: 'stage-state--completed',
    description: 'Stage has been completed successfully.',
  },
  failed: {
    state: 'failed',
    label: 'Failed',
    icon: '⚠',
    ariaLabel: 'Stage has failed',
    badgeClass: 'stage-state--failed',
    description: 'Attempt failed. Additional learning effort required.',
  },
  generating: {
    state: 'generating',
    label: 'Generating',
    icon: '⚙',
    ariaLabel: 'Certificate is generating',
    badgeClass: 'stage-state--generating',
    description: 'Certificate issuance is currently processing.',
  },
};

/**
 * Returns UI metadata for a given stage state with a safe fallback to 'locked'.
 * @param {string} state
 * @returns {typeof STAGE_STATE_MAP['locked']}
 */
export function getStageStateMeta(state) {
  return STAGE_STATE_MAP[state] || STAGE_STATE_MAP.locked;
}

/**
 * Determines if a task is a workflow task based on backend flag.
 * Never infers workflow state; strictly relies on workflowEnabled.
 * @param {object|null|undefined} task
 * @returns {boolean}
 */
export function isWorkflowTask(task) {
  return Boolean(task && task.workflowEnabled === true);
}
