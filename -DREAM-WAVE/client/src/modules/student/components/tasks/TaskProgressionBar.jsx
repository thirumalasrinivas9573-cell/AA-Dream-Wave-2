import { memo } from 'react';
import { STAGE_DEFINITIONS, getStageStateMeta } from '../../utils/taskProgression';

/**
 * Presentational stage item component.
 * Takes a `state` prop only (no internal API calls).
 * Displays stage step, name, and state with both icon and text for accessibility.
 */
export const StageItem = memo(function StageItem({
  _stageKey,
  label,
  stepNumber,
  state = 'locked',
  compact = false,
}) {
  const meta = getStageStateMeta(state);
  const isCurrent = state === 'current' || state === 'ready_for_verification' || state === 'generating';

  return (
    <li
      className={`task-stage-item task-stage-item--${meta.state} ${isCurrent ? 'is-current' : ''} ${compact ? 'task-stage-item--compact' : ''}`}
      tabIndex={0}
      role="listitem"
      aria-label={`${label} stage (Step ${stepNumber}): ${meta.label}`}
      aria-current={isCurrent ? 'step' : undefined}
    >
      <div className="task-stage-item__header">
        <span className="task-stage-item__step-number" aria-hidden="true">{stepNumber}</span>
        <span className="task-stage-item__title">{label}</span>
      </div>
      <div className={`task-stage-item__badge ${meta.badgeClass}`} aria-hidden="true">
        <span className="task-stage-item__badge-icon">{meta.icon}</span>
        <span className="task-stage-item__badge-text">{meta.label}</span>
      </div>
      <span className="sr-only">Status: {meta.label}</span>
    </li>
  );
});

/**
 * Presentational TaskProgressionBar component.
 * Renders the three stages: Learning -> Exam -> Certification.
 * No internal API calls; purely driven by props.
 *
 * @param {object} props
 * @param {object} [props.stagesSummary] - Object with { learning, exam, certification } state strings
 * @param {object} [props.stages] - Object with { learning: { state }, exam: { state }, certification: { state } }
 * @param {boolean} [props.compact] - Compact rendering for cards/Kanban
 * @param {string} [props.className] - Additional CSS classes
 */
export const TaskProgressionBar = memo(function TaskProgressionBar({
  stagesSummary,
  stages,
  compact = false,
  className = '',
}) {
  const resolveState = (stageId) => {
    if (stagesSummary && stagesSummary[stageId]) {
      return stagesSummary[stageId];
    }
    if (stages && stages[stageId]) {
      const stageObj = stages[stageId];
      return typeof stageObj === 'string' ? stageObj : stageObj.state || 'locked';
    }
    return 'locked';
  };

  return (
    <nav
      className={`task-progression-bar ${compact ? 'task-progression-bar--compact' : ''} ${className}`}
      aria-label="Task progression: Learning, Exam, Certification"
    >
      <ol className="task-progression-bar__list" role="list">
        {STAGE_DEFINITIONS.map((def, idx) => {
          const state = resolveState(def.id);
          return (
            <div key={def.id} className="task-progression-bar__item-wrapper">
              {idx > 0 && (
                <span className="task-progression-bar__separator" aria-hidden="true">
                  →
                </span>
              )}
              <StageItem
                stageKey={def.id}
                label={def.label}
                stepNumber={def.stepNumber}
                state={state}
                compact={compact}
              />
            </div>
          );
        })}
      </ol>
    </nav>
  );
});

export default TaskProgressionBar;
