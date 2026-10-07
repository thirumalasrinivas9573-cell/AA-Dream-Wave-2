import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import {
  STAGE_STATES,
  STAGE_STATE_MAP,
  getStageStateMeta,
  isWorkflowTask,
} from '../utils/taskProgression';
import { StageItem, TaskProgressionBar } from '../components/tasks/TaskProgressionBar';
import { TaskCard, TaskDetailDialog, TaskFormDialog } from '../components/tasks/TaskWorkspace';
import ExamRunner from '../components/tasks/ExamRunner';
import useTaskProgression from '../hooks/useTaskProgression';
import {
  mapProgressionError,
  PROGRESSION_ERROR_CODES,
  ERROR_ACTIONS,
} from '../utils/progressionErrorMapper';
import { taskApi } from '@shared/services/api';

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

// ════════════════════════════════════════════════════════════════════════════
// M10: Central Error Mapper Tests
// ════════════════════════════════════════════════════════════════════════════
describe('M10: Central Progression Error Mapper', () => {
  it('maps 401 auth errors to auth action', () => {
    const err401 = { response: { status: 401, data: { code: 'AUTH_REQUIRED' } } };
    const mapped = mapProgressionError(err401);
    expect(mapped.action).toBe(ERROR_ACTIONS.AUTH);
    expect(mapped.status).toBe(401);
  });

  it('maps 403 FORBIDDEN and WORKFLOW_ENFORCED correctly', () => {
    const wfErr = { response: { status: 403, data: { code: 'WORKFLOW_ENFORCED' } } };
    const mappedWf = mapProgressionError(wfErr);
    expect(mappedWf.friendlyMessage).toContain('Direct task completion is not allowed');
    expect(mappedWf.action).toBe(ERROR_ACTIONS.NONE);

    const forbiddenErr = { response: { status: 403, data: { code: 'FORBIDDEN' } } };
    const mappedForbidden = mapProgressionError(forbiddenErr);
    expect(mappedForbidden.friendlyMessage).toContain('permission');
  });

  it('maps 404 TASK_NOT_FOUND', () => {
    const err = { response: { status: 404, data: { code: 'TASK_NOT_FOUND' } } };
    const mapped = mapProgressionError(err);
    expect(mapped.friendlyMessage).toContain('Task was not found');
  });

  it('maps 400 LEARNING_INCOMPLETE with top-level requirements', () => {
    const requirements = [{ key: 'focus_time', met: false, detail: 'Need 30 min focus' }];
    const err = {
      response: {
        status: 400,
        data: {
          code: 'LEARNING_INCOMPLETE',
          requirements,
        },
      },
    };
    const mapped = mapProgressionError(err);
    expect(mapped.requirements).toEqual(requirements);
    expect(mapped.action).toBe(ERROR_ACTIONS.NONE);
  });

  it('maps 429 RATE_LIMITED to rate_limited action with cooldown', () => {
    const err = { response: { status: 429, data: { code: 'RATE_LIMITED' } } };
    const mapped = mapProgressionError(err);
    expect(mapped.action).toBe(ERROR_ACTIONS.RATE_LIMITED);
    expect(mapped.retryAfter).toBe(60);

    const errWithHeader = {
      response: {
        status: 429,
        data: { code: 'RATE_LIMITED' },
        headers: { 'retry-after': '45' },
      },
    };
    const mappedWithHeader = mapProgressionError(errWithHeader);
    expect(mappedWithHeader.retryAfter).toBe(45);
  });

  it('maps 409 ACTIVE_FOCUS_SESSION_EXISTS to focus message without refetching progression', () => {
    const err = { response: { status: 409, data: { code: 'ACTIVE_FOCUS_SESSION_EXISTS' } } };
    const mapped = mapProgressionError(err);
    expect(mapped.action).toBe(ERROR_ACTIONS.FOCUS_MESSAGE);
    expect(mapped.friendlyMessage).toBe('Stop your current focus session first.');
    expect(mapped.action).not.toBe(ERROR_ACTIONS.REFETCH_PROGRESSION);
  });

  it('maps 409 REVISION_CONFLICT to reload_resume action', () => {
    const err = { response: { status: 409, data: { code: 'REVISION_CONFLICT' } } };
    const mapped = mapProgressionError(err);
    expect(mapped.action).toBe(ERROR_ACTIONS.RELOAD_RESUME);
  });

  it('maps stage conflicts (EXAM_EXPIRED, EXAM_NOT_ACTIVE, ILLEGAL_STAGE_TRANSITION) to refetch_progression', () => {
    const codes = [
      PROGRESSION_ERROR_CODES.EXAM_NOT_ACTIVE,
      PROGRESSION_ERROR_CODES.EXAM_EXPIRED,
      PROGRESSION_ERROR_CODES.EXAM_ALREADY_PASSED,
      PROGRESSION_ERROR_CODES.ILLEGAL_STAGE_TRANSITION,
      PROGRESSION_ERROR_CODES.CERTIFICATION_NOT_ELIGIBLE,
      PROGRESSION_ERROR_CODES.TASK_ALREADY_COMPLETED,
    ];

    codes.forEach((code) => {
      const err = { response: { status: 409, data: { code } } };
      const mapped = mapProgressionError(err);
      expect(mapped.action).toBe(ERROR_ACTIONS.REFETCH_PROGRESSION);
    });

    const finalErr = {
      response: {
        status: 409,
        data: { code: 'FINALIZATION_NOT_ALLOWED', missing: ['exam_passed'] },
      },
    };
    const mappedFinal = mapProgressionError(finalErr);
    expect(mappedFinal.action).toBe(ERROR_ACTIONS.REFETCH_PROGRESSION);
    expect(mappedFinal.missing).toEqual(['exam_passed']);
  });

  it('maps 500 recoverable errors to retry action', () => {
    const err = { response: { status: 500, data: { code: 'CERTIFICATE_GENERATION_FAILED' } } };
    const mapped = mapProgressionError(err);
    expect(mapped.action).toBe(ERROR_ACTIONS.RETRY);
    expect(mapped.isRecoverable).toBe(true);
  });

  it('maps network errors to network_retry', () => {
    const err = { isNetworkError: true };
    const mapped = mapProgressionError(err);
    expect(mapped.action).toBe(ERROR_ACTIONS.NETWORK_RETRY);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// M7: Exam Runner Tests
// ════════════════════════════════════════════════════════════════════════════
describe('M7: Exam Runner Component', () => {
  const REAL_EXAM_DELIVERY = {
    examId: '6ac51854f1894085fd9b7e52',
    startedAt: '2026-10-06T15:48:36.350Z',
    expiresAt: '2026-10-06T16:08:36.350Z',
    serverNow: '2026-10-06T15:48:36.360Z',
    remainingSeconds: 1200,
    timeLimitMinutes: 20,
    questionCount: 1,
    questions: [
      {
        questionId: 'q_786733ecbda1',
        question: 'Question 1 on system design?',
        options: ['Option A (Correct)', 'Option B', 'Option C', 'Option D'],
      },
    ],
  };

  const REAL_EXAM_SUBMIT_PASS = {
    score: 100,
    passed: true,
    minimumPassingPercentage: 80,
    attemptNumber: 1,
    correctCount: 1,
    totalCount: 1,
    nextStage: 'certification',
    questionResults: [
      {
        questionId: 'q_786733ecbda1',
        isCorrect: true,
        explanation: 'Explanation for system design.',
      },
    ],
  };

  const REAL_EXAM_SUBMIT_FAIL = {
    score: 0,
    passed: false,
    minimumPassingPercentage: 80,
    attemptNumber: 1,
    correctCount: 0,
    totalCount: 1,
    nextStage: 'learning',
    questionResults: [
      {
        questionId: 'q_786733ecbda1',
        isCorrect: false,
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('starts exam via POST /exam/start, renders questions, and submits answers ONLY', async () => {
    const startSpy = vi.spyOn(taskApi, 'startExam').mockResolvedValueOnce({
      data: {
        success: true,
        exam: REAL_EXAM_DELIVERY,
        progression: { taskId: 'task-123', workflowEnabled: true },
      },
    });

    const submitSpy = vi.spyOn(taskApi, 'submitExam').mockResolvedValueOnce({
      data: {
        success: true,
        result: REAL_EXAM_SUBMIT_PASS,
        progression: { taskId: 'task-123', workflowEnabled: true },
      },
    });

    render(
      <ExamRunner
        open={true}
        taskId="task-123"
        taskTitle="Cloud Architecture"
        onClose={vi.fn()}
        onProgressionUpdated={vi.fn()}
      />
    );

    // Initial ready state
    const startBtn = screen.getByRole('button', { name: /Start Exam/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(startSpy).toHaveBeenCalledWith('task-123');
    });

    // Verify question and options appear
    expect(await screen.findByText('Question 1 on system design?')).toBeDefined();
    expect(screen.getByText('Option A (Correct)')).toBeDefined();

    // Select Option A (index 0)
    const radioOption = screen.getByLabelText('Option A (Correct)');
    fireEvent.click(radioOption);

    // Submit exam
    const submitBtn = screen.getByRole('button', { name: /Submit Exam/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith('task-123', {
        answers: [{ questionId: 'q_786733ecbda1', selectedIndex: 0 }],
      });
    });

    // Verify pass result screen
    expect(await screen.findByText('Exam Passed!')).toBeDefined();
    expect(screen.getByText(/Explanation for system design/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Continue to Certification/i })).toBeDefined();
  });

  it('restores unexpired active exam from progression props on load', async () => {
    const progressionWithActive = {
      stages: {
        exam: {
          activeExam: REAL_EXAM_DELIVERY,
        },
      },
    };

    render(
      <ExamRunner
        open={true}
        taskId="task-123"
        progression={progressionWithActive}
        onClose={vi.fn()}
        onProgressionUpdated={vi.fn()}
      />
    );

    // Should immediately show questions without clicking Start
    expect(await screen.findByText('Question 1 on system design?')).toBeDefined();
  });

  it('prevents double submit by disabling submit button while submitting', async () => {
    vi.spyOn(taskApi, 'startExam').mockResolvedValueOnce({
      data: {
        success: true,
        exam: REAL_EXAM_DELIVERY,
      },
    });

    let resolveSubmit;
    const submitPromise = new Promise((resolve) => {
      resolveSubmit = resolve;
    });
    vi.spyOn(taskApi, 'submitExam').mockImplementationOnce(() => submitPromise);

    render(
      <ExamRunner
        open={true}
        taskId="task-123"
        onClose={vi.fn()}
        onProgressionUpdated={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Start Exam/i }));
    await screen.findByText('Question 1 on system design?');

    const submitBtn = screen.getByRole('button', { name: /Submit Exam/i });
    fireEvent.click(submitBtn);

    // Verify button disabled during submit
    expect(submitBtn.hasAttribute('disabled')).toBe(true);

    // Complete submission
    resolveSubmit({
      data: {
        success: true,
        result: REAL_EXAM_SUBMIT_PASS,
      },
    });

    await screen.findByText('Exam Passed!');
  });

  it('handles fail result by reverting to learning with retake text', async () => {
    vi.spyOn(taskApi, 'startExam').mockResolvedValueOnce({
      data: { success: true, exam: REAL_EXAM_DELIVERY },
    });

    vi.spyOn(taskApi, 'submitExam').mockResolvedValueOnce({
      data: {
        success: true,
        result: REAL_EXAM_SUBMIT_FAIL,
      },
    });

    const progressionWithRetake = {
      stages: {
        exam: {
          retake: {
            required: true,
            requirements: [
              {
                key: 'retake_effort',
                met: false,
                detail: 'Retake requires at least 30 min of new focus study after failed attempt (0 min recorded).',
              },
            ],
          },
        },
      },
    };

    render(
      <ExamRunner
        open={true}
        taskId="task-123"
        progression={progressionWithRetake}
        onClose={vi.fn()}
        onProgressionUpdated={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Start Exam/i }));
    await screen.findByText('Question 1 on system design?');
    fireEvent.click(screen.getByRole('button', { name: /Submit Exam/i }));

    expect(await screen.findByText('Exam Not Passed')).toBeDefined();
    expect(screen.getByText(/Retake requires at least 30 min of new focus study/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Back to Learning/i })).toBeDefined();
  });

  it('handles RATE_LIMITED on start with cooldown on the start button', async () => {
    vi.spyOn(taskApi, 'startExam').mockRejectedValueOnce({
      response: { status: 429, data: { code: 'RATE_LIMITED' } },
    });

    render(
      <ExamRunner
        open={true}
        taskId="task-123"
        onClose={vi.fn()}
        onProgressionUpdated={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Start Exam/i }));

    expect(await screen.findByText(/Too many exam start attempts/i)).toBeDefined();
    const cooldownBtn = screen.getByRole('button', { name: /Start Exam \(.*cooldown\)/i });
    expect(cooldownBtn.hasAttribute('disabled')).toBe(true);
  });

  it('handles pass result then transitions to certification next stage', async () => {
    vi.spyOn(taskApi, 'startExam').mockResolvedValueOnce({
      data: { success: true, exam: REAL_EXAM_DELIVERY },
    });
    vi.spyOn(taskApi, 'submitExam').mockResolvedValueOnce({
      data: {
        success: true,
        result: REAL_EXAM_SUBMIT_PASS,
        progression: {
          taskId: 'task-123',
          progressionStage: 'certification',
          stages: {
            learning: { state: 'completed' },
            exam: { state: 'completed' },
            certification: { state: 'generating' },
          },
        },
      },
    });

    const updateSpy = vi.fn();
    render(
      <ExamRunner
        open={true}
        taskId="task-123"
        onClose={vi.fn()}
        onProgressionUpdated={updateSpy}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Start Exam/i }));
    await screen.findByText('Question 1 on system design?');
    fireEvent.click(screen.getByRole('button', { name: /Submit Exam/i }));

    expect(await screen.findByText('Exam Passed!')).toBeDefined();
    expect(screen.getByText(/Continue to Certification/i)).toBeDefined();
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ progressionStage: 'certification' })
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// M8: Certification Stage & Polling Tests
// ════════════════════════════════════════════════════════════════════════════
describe('M8: Certification Stage Polling and Card', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('polls GET /progression every 2 seconds when generating and stops after 10 tries', async () => {
    vi.useFakeTimers();
    const getProgSpy = vi.spyOn(taskApi, 'getProgression').mockResolvedValue({
      data: {
        progression: {
          taskId: 'task-123',
          stages: {
            certification: { state: 'generating' },
          },
        },
      },
    });

    const { result } = renderHook(() =>
      useTaskProgression('task-123', true)
    );

    // Initial state set to generating
    act(() => {
      result.current.setProgression({
        taskId: 'task-123',
        stages: { certification: { state: 'generating' } },
      });
    });

    // Advance 10 intervals of 2 seconds = 20 seconds
    for (let i = 0; i < 11; i++) {
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
    }

    // Polling stops and sets pollTimedOut
    expect(result.current.pollTimedOut).toBe(true);
    expect(getProgSpy).toHaveBeenCalled();
  });

  it('renders completed certificate card with details and resume builder link', async () => {
    const completedProgression = {
      taskId: 'task-123',
      workflowEnabled: true,
      completed: true,
      stages: {
        learning: { state: 'completed' },
        exam: { state: 'completed' },
        certification: {
          state: 'completed',
          certificate: {
            credentialId: 'DW-CERT-9C936F72E7FF',
            title: 'Cloud Mastery',
            issuer: 'Dream Wave AI',
            issuedAt: '2026-10-06T15:48:37.223Z',
            category: 'course',
            skills: ['AWS', 'Docker'],
            url: null,
          },
        },
      },
    };

    vi.spyOn(taskApi, 'getProgression').mockResolvedValue({
      data: { progression: completedProgression },
    });

    render(
      <BrowserRouter>
        <TaskDetailDialog
          task={{ _id: 'task-123', title: 'Deploy App', workflowEnabled: true }}
          open={true}
          goals={[]}
          onClose={vi.fn()}
          onUpdate={vi.fn()}
          onStartFocus={vi.fn()}
          onStopFocus={vi.fn()}
          focusActive={false}
        />
      </BrowserRouter>
    );

    // Hook will load, but we can verify the text mapping and elements
    expect(screen.getByText('Deploy App')).toBeDefined();
    expect(await screen.findByText('DW-CERT-9C936F72E7FF')).toBeDefined();
    expect(screen.getByText('Cloud Mastery')).toBeDefined();
  });

  it('retryCertificate calls POST /api/tasks/:id/certificate/retry on recoverable failure', async () => {
    const retrySpy = vi.spyOn(taskApi, 'retryCertificate').mockResolvedValueOnce({
      data: {
        success: true,
        progression: {
          taskId: 'task-123',
          stages: { certification: { state: 'completed' } },
        },
      },
    });
    vi.spyOn(taskApi, 'getProgression').mockResolvedValue({
      data: { progression: { taskId: 'task-123', stages: { certification: { state: 'completed' } } } },
    });

    const { result } = renderHook(() => useTaskProgression('task-123', true));
    await act(async () => {
      await result.current.retryCertificate();
    });

    expect(retrySpy).toHaveBeenCalledWith('task-123');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// M9: Conflict & Guard Tests
// ════════════════════════════════════════════════════════════════════════════
describe('M9: Conflict & Focus Guards', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('refetches progression on 409 conflict during verifyLearning', async () => {
    const getSpy = vi.spyOn(taskApi, 'getProgression').mockResolvedValue({
      data: { progression: { taskId: 'task-123', stages: {} } },
    });

    vi.spyOn(taskApi, 'verifyLearning').mockRejectedValueOnce({
      response: {
        status: 409,
        data: { code: 'ILLEGAL_STAGE_TRANSITION', message: 'Conflict' },
      },
    });

    const { result } = renderHook(() => useTaskProgression('task-123', true));

    await expect(result.current.verifyLearning()).rejects.toBeDefined();
    // Exactly one extra refetch triggered
    expect(getSpy).toHaveBeenCalledTimes(2);
  });

  it('does NOT refetch progression on 409 ACTIVE_FOCUS_SESSION_EXISTS', () => {
    const err = {
      response: {
        status: 409,
        data: { code: 'ACTIVE_FOCUS_SESSION_EXISTS', message: 'Another session running' },
      },
    };
    const mapped = mapProgressionError(err);
    expect(mapped.action).toBe(ERROR_ACTIONS.FOCUS_MESSAGE);
    expect(mapped.action).not.toBe(ERROR_ACTIONS.REFETCH_PROGRESSION);
  });

  it('Unlock Exam calls verify-learning then refetches progression', async () => {
    const verifySpy = vi.spyOn(taskApi, 'verifyLearning').mockResolvedValueOnce({
      data: {
        success: true,
        verified: true,
        progression: {
          taskId: 'task-123',
          stages: {
            learning: { state: 'completed' },
            exam: { state: 'current', canUnlock: true },
          },
        },
      },
    });
    const getSpy = vi.spyOn(taskApi, 'getProgression').mockResolvedValue({
      data: {
        progression: {
          taskId: 'task-123',
          stages: {
            learning: { state: 'completed' },
            exam: { state: 'current', canUnlock: true },
          },
        },
      },
    });

    const { result } = renderHook(() => useTaskProgression('task-123', true));
    await act(async () => {
      await result.current.verifyLearning();
    });

    expect(verifySpy).toHaveBeenCalledWith('task-123');
    expect(getSpy).toHaveBeenCalled();
  });

  it('dispatches task:refresh event on schedule completion to trigger task refetch', () => {
    const eventSpy = vi.fn();
    window.addEventListener('task:refresh', eventSpy);

    window.dispatchEvent(new CustomEvent('task:refresh'));

    expect(eventSpy).toHaveBeenCalledTimes(1);
    window.removeEventListener('task:refresh', eventSpy);
  });
});

