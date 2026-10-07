import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import {
  STAGE_STATES,
  STAGE_STATE_MAP,
  getStageStateMeta,
  isWorkflowTask,
} from '../utils/taskProgression';
import { StageItem, TaskProgressionBar } from '../components/tasks/TaskProgressionBar';
import { TaskCard, TaskFormDialog } from '../components/tasks/TaskWorkspace';

describe('Task Progression: Stage State Mapping', () => {
  it('maps all six stage states to correct labels and icons', () => {
    const states = [
      STAGE_STATES.LOCKED,
      STAGE_STATES.CURRENT,
      STAGE_STATES.READY_FOR_VERIFICATION,
      STAGE_STATES.COMPLETED,
      STAGE_STATES.FAILED,
      STAGE_STATES.GENERATING,
    ];

    states.forEach((state) => {
      const meta = getStageStateMeta(state);
      expect(meta).toBeDefined();
      expect(meta.state).toBe(state);
      expect(typeof meta.label).toBe('string');
      expect(typeof meta.icon).toBe('string');
      expect(meta.icon.length).toBeGreaterThan(0);
      expect(meta.badgeClass).toContain(`stage-state--`);
    });

    expect(STAGE_STATE_MAP.locked.icon).toBe('🔒');
    expect(STAGE_STATE_MAP.locked.label).toBe('Locked');

    expect(STAGE_STATE_MAP.current.icon).toBe('⏳');
    expect(STAGE_STATE_MAP.current.label).toBe('In Progress');

    expect(STAGE_STATE_MAP.ready_for_verification.icon).toBe('🔓');
    expect(STAGE_STATE_MAP.ready_for_verification.label).toBe('Ready to Unlock');

    expect(STAGE_STATE_MAP.completed.icon).toBe('✓');
    expect(STAGE_STATE_MAP.completed.label).toBe('Completed');

    expect(STAGE_STATE_MAP.failed.icon).toBe('⚠');
    expect(STAGE_STATE_MAP.failed.label).toBe('Failed');

    expect(STAGE_STATE_MAP.generating.icon).toBe('⚙');
    expect(STAGE_STATE_MAP.generating.label).toBe('Generating');
  });

  it('safely falls back to locked for unknown states', () => {
    const fallback = getStageStateMeta('invalid_state_xyz');
    expect(fallback.state).toBe('locked');
    expect(fallback.label).toBe('Locked');
    expect(fallback.icon).toBe('🔒');
  });

  it('correctly checks isWorkflowTask using workflowEnabled boolean', () => {
    expect(isWorkflowTask({ workflowEnabled: true })).toBe(true);
    expect(isWorkflowTask({ workflowEnabled: false })).toBe(false);
    expect(isWorkflowTask({})).toBe(false);
    expect(isWorkflowTask(null)).toBe(false);
    expect(isWorkflowTask(undefined)).toBe(false);
  });
});

describe('TaskProgressionBar & StageItem Presentational Components', () => {
  it('renders a StageItem with both icon and text (not colour only)', () => {
    render(
      <ol>
        <StageItem stageKey="learning" label="Learning" stepNumber={1} state="ready_for_verification" />
      </ol>
    );

    const item = screen.getByRole('listitem');
    expect(item).toBeDefined();
    expect(item.getAttribute('aria-label')).toBe('Learning stage (Step 1): Ready to Unlock');
    expect(screen.getByText('Ready to Unlock')).toBeDefined();
    expect(screen.getByText('🔓')).toBeDefined();
    expect(screen.getByText('Learning')).toBeDefined();
  });

  it('renders TaskProgressionBar with all 3 stages for every state', () => {
    const testCases = [
      {
        summary: { learning: 'current', exam: 'locked', certification: 'locked' },
        expectedTexts: ['In Progress', 'Locked', 'Locked'],
      },
      {
        summary: { learning: 'ready_for_verification', exam: 'locked', certification: 'locked' },
        expectedTexts: ['Ready to Unlock', 'Locked', 'Locked'],
      },
      {
        summary: { learning: 'completed', exam: 'current', certification: 'locked' },
        expectedTexts: ['Completed', 'In Progress', 'Locked'],
      },
      {
        summary: { learning: 'completed', exam: 'completed', certification: 'generating' },
        expectedTexts: ['Completed', 'Completed', 'Generating'],
      },
      {
        summary: { learning: 'completed', exam: 'completed', certification: 'completed' },
        expectedTexts: ['Completed', 'Completed', 'Completed'],
      },
      {
        summary: { learning: 'current', exam: 'failed', certification: 'locked' },
        expectedTexts: ['In Progress', 'Failed', 'Locked'],
      },
    ];

    testCases.forEach(({ summary, expectedTexts }) => {
      const { unmount } = render(<TaskProgressionBar stagesSummary={summary} />);
      expectedTexts.forEach((text) => {
        expect(screen.getAllByText(text).length).toBeGreaterThan(0);
      });
      unmount();
    });
  });

  it('supports compact mode and has proper accessibility attributes', () => {
    render(
      <TaskProgressionBar
        stagesSummary={{ learning: 'completed', exam: 'current', certification: 'locked' }}
        compact
      />
    );

    const nav = screen.getByRole('navigation', { name: /Task progression/i });
    expect(nav).toBeDefined();
    expect(nav.className).toContain('task-progression-bar--compact');

    const items = screen.getAllByRole('listitem');
    expect(items.length).toBe(3);
    expect(items[1].getAttribute('aria-current')).toBe('step');
  });
});

describe('Completion Guards: Workflow vs Legacy Tasks', () => {
  const legacyTask = {
    _id: 'task-1',
    title: 'Legacy Practice Task',
    status: 'todo',
    completed: false,
    workflowEnabled: false,
    priority: 'Medium',
    category: 'General',
  };

  const workflowTask = {
    _id: 'task-2',
    title: 'Workflow Core Task',
    status: 'todo',
    completed: false,
    workflowEnabled: true,
    priority: 'High',
    category: 'General',
    stagesSummary: {
      learning: 'current',
      exam: 'locked',
      certification: 'locked',
    },
  };

  it('enables completion controls on legacy tasks', () => {
    const onComplete = vi.fn();
    const onStatus = vi.fn();

    render(
      <BrowserRouter>
        <TaskCard
          task={legacyTask}
          onOpen={vi.fn()}
          onComplete={onComplete}
          onStatus={onStatus}
          onDuplicate={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </BrowserRouter>
    );

    const checkBtn = screen.getByRole('button', { name: /Complete Legacy Practice Task/i });
    expect(checkBtn.hasAttribute('disabled')).toBe(false);
    fireEvent.click(checkBtn);
    expect(onComplete).toHaveBeenCalledTimes(1);

    const select = screen.getByRole('combobox', { name: /Move Legacy Practice Task/i });
    const completedOption = select.querySelector('option[value="completed"]');
    expect(completedOption.hasAttribute('disabled')).toBe(false);

    expect(screen.queryByText(/⚡ Workflow/i)).toBeNull();
  });

  it('disables completion checkbox and completed status option on workflow tasks', () => {
    const onComplete = vi.fn();
    const onStatus = vi.fn();

    render(
      <BrowserRouter>
        <TaskCard
          task={workflowTask}
          onOpen={vi.fn()}
          onComplete={onComplete}
          onStatus={onStatus}
          onDuplicate={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </BrowserRouter>
    );

    const checkBtn = screen.getByRole('button', {
      name: /Workflow tasks complete through Learning, Exam and Certification stages/i,
    });
    expect(checkBtn.hasAttribute('disabled')).toBe(true);
    expect(checkBtn.getAttribute('title')).toBe('Complete the Learning, Exam and Certification stages');

    fireEvent.click(checkBtn);
    expect(onComplete).not.toHaveBeenCalled();

    const select = screen.getByRole('combobox', { name: /Move Workflow Core Task/i });
    const completedOption = select.querySelector('option[value="completed"]');
    expect(completedOption.hasAttribute('disabled')).toBe(true);
    expect(completedOption.textContent).toContain('(workflow enforced)');

    expect(screen.getByText('⚡ Workflow')).toBeDefined();
    expect(screen.getByText('Learning')).toBeDefined();
  });

  it('disables completed status in TaskFormDialog for workflow tasks and enables for legacy', () => {
    const { unmount } = render(
      <TaskFormDialog
        open={true}
        task={workflowTask}
        goals={[]}
        roadmaps={[]}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    const statusSelect = screen.getByRole('combobox', { name: /Status/i });
    const completedOption = statusSelect.querySelector('option[value="completed"]');
    expect(completedOption.hasAttribute('disabled')).toBe(true);
    expect(completedOption.textContent).toContain('(workflow enforced)');
    unmount();

    render(
      <TaskFormDialog
        open={true}
        task={legacyTask}
        goals={[]}
        roadmaps={[]}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    const legacySelect = screen.getByRole('combobox', { name: /Status/i });
    const legacyCompleted = legacySelect.querySelector('option[value="completed"]');
    expect(legacyCompleted.hasAttribute('disabled')).toBe(false);
  });
});
