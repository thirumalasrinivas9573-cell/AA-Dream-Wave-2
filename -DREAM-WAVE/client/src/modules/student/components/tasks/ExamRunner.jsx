import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dialog } from '@shared/components/ui';
import { taskApi } from '@shared/services/api';
import { mapProgressionError, ERROR_ACTIONS } from '../../utils/progressionErrorMapper';

/**
 * Format remaining seconds into MM:SS.
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatTimeRemaining(totalSeconds) {
  if (totalSeconds <= 0) return '00:00';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * ExamRunner Dialog Component (M7).
 * Handles starting, resuming, active timed question delivery, and result display.
 * Authoritative API reference: server/docs/task-progression-api.md (5.4 & 5.5).
 */
export default function ExamRunner({
  open,
  taskId,
  taskTitle = 'Task Exam',
  progression,
  onClose,
  onProgressionUpdated,
}) {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'starting' | 'active' | 'submitting' | 'result' | 'expired'
  const [examData, setExamData] = useState(null);
  const [answers, setAnswers] = useState({}); // { [questionId]: selectedIndex }
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [examResult, setExamResult] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Time reference values computed ONCE at fetch/resume time
  const timerRefs = useRef({
    serverExpiry: 0,
    clockOffset: 0,
  });

  // Check for active unexpired exam from progression (for page refresh restore)
  const activeExamFromProps = progression?.stages?.exam?.activeExam;

  // Initialize or restore exam state
  useEffect(() => {
    if (!open) {
      setPhase('idle');
      setError('');
      setShowExitConfirm(false);
      return;
    }

    if (activeExamFromProps && activeExamFromProps.questions?.length) {
      // Restore active exam session
      const serverTimeAtFetch = new Date(activeExamFromProps.serverNow || Date.now()).getTime();
      const clockOffset = Date.now() - serverTimeAtFetch;
      const remainingSec = activeExamFromProps.remainingSeconds || 0;
      const serverExpiry = serverTimeAtFetch + remainingSec * 1000;

      timerRefs.current = { serverExpiry, clockOffset };
      setExamData(activeExamFromProps);
      setTimeLeft(remainingSec);
      setPhase('active');
    } else if (phase === 'idle') {
      setPhase('ready_to_start');
    }
  }, [open, activeExamFromProps, phase]);

  // Cooldown countdown for RATE_LIMITED on start button
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Countdown timer during active exam
  useEffect(() => {
    if (phase !== 'active' || !examData) return;

    const interval = setInterval(() => {
      const currentServerNow = Date.now() - timerRefs.current.clockOffset;
      const remaining = Math.max(0, Math.floor((timerRefs.current.serverExpiry - currentServerNow) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        setPhase('expired');
        // Backend rolls expired exam back to Learning; refetch progression
        if (onProgressionUpdated) {
          onProgressionUpdated();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, examData, onProgressionUpdated]);

  // Handle Starting the Exam (POST /api/tasks/:id/exam/start)
  const handleStartExam = async () => {
    if (!taskId || cooldown > 0 || phase === 'starting') return;
    setPhase('starting');
    setError('');

    try {
      const response = await taskApi.startExam(taskId);
      const data = response.data;
      const startedExam = data.exam;

      if (!startedExam || !startedExam.questions) {
        throw new Error('Exam payload missing question data.');
      }

      // Compute clock offset once using serverNow and remainingSeconds
      const serverTimeAtFetch = new Date(startedExam.serverNow || Date.now()).getTime();
      const clockOffset = Date.now() - serverTimeAtFetch;
      const remainingSec = startedExam.remainingSeconds || 0;
      const serverExpiry = serverTimeAtFetch + remainingSec * 1000;

      timerRefs.current = { serverExpiry, clockOffset };
      setExamData(startedExam);
      setTimeLeft(remainingSec);
      setAnswers({});
      setPhase('active');

      if (data.progression && onProgressionUpdated) {
        onProgressionUpdated(data.progression);
      }
    } catch (err) {
      const mapped = mapProgressionError(err);
      if (mapped.action === ERROR_ACTIONS.RATE_LIMITED) {
        setCooldown(mapped.retryAfter || 60);
      }
      if (mapped.action === ERROR_ACTIONS.REFETCH_PROGRESSION && onProgressionUpdated) {
        onProgressionUpdated();
      }
      setError(mapped.friendlyMessage);
      setPhase('ready_to_start');
    }
  };

  // Handle selecting an option
  const handleSelectOption = (questionId, optionIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  // Handle Exam Submission (POST /api/tasks/:id/exam/submit)
  const handleSubmitExam = async (event) => {
    if (event) event.preventDefault();
    if (phase === 'submitting' || !examData) return;

    // Build payload: [{ questionId, selectedIndex }] ONLY (never score/passed)
    const formattedAnswers = (examData.questions || []).map((q) => ({
      questionId: q.questionId,
      selectedIndex: answers[q.questionId] !== undefined ? answers[q.questionId] : -1,
    }));

    setPhase('submitting');
    setError('');

    try {
      const response = await taskApi.submitExam(taskId, { answers: formattedAnswers });
      const { result, progression: updatedProg } = response.data;

      setExamResult(result);
      setPhase('result');

      if (updatedProg && onProgressionUpdated) {
        onProgressionUpdated(updatedProg);
      }
    } catch (err) {
      const mapped = mapProgressionError(err);
      if (mapped.action === ERROR_ACTIONS.REFETCH_PROGRESSION && onProgressionUpdated) {
        onProgressionUpdated();
      }
      setError(mapped.friendlyMessage);
      setPhase('active');
    }
  };

  // Safe Close Handler with warning if active
  const handleAttemptClose = () => {
    if (phase === 'active') {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const answeredCount = useMemo(() => {
    return Object.keys(answers).length;
  }, [answers]);

  const totalQuestions = examData?.questions?.length || 0;

  return (
    <Dialog
      open={open}
      title={`Competency Exam: ${taskTitle}`}
      description={
        phase === 'active'
          ? `Timer: ${formatTimeRemaining(timeLeft)} · ${answeredCount} of ${totalQuestions} answered`
          : 'Official assessment for task certification.'
      }
      onClose={handleAttemptClose}
    >
      <div className="exam-runner" tabIndex={0} aria-label="Exam Runner Container">
        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}

        {/* 1. Ready to start screen */}
        {phase === 'ready_to_start' && (
          <div className="exam-runner__intro">
            <div className="exam-runner__notice-box">
              <h3>Assessment Guidelines</h3>
              <ul>
                <li>Multiple-choice assessment generated from task competencies.</li>
                <li>Passing grade: <strong>{progression?.stages?.exam?.minimumPassingPercentage || 80}%</strong>.</li>
                <li>Timed session (20 minutes). Clock is server-managed.</li>
                <li>If the timer reaches zero, the attempt expires and returns to Learning.</li>
              </ul>
            </div>
            <footer className="exam-runner__actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleStartExam}
                disabled={cooldown > 0}
              >
                {cooldown > 0 ? `Start Exam (${cooldown}s cooldown)` : 'Start Exam'}
              </Button>
            </footer>
          </div>
        )}

        {/* 2. Loading state */}
        {phase === 'starting' && (
          <div className="exam-runner__loading" style={{ textAlign: 'center', padding: '36px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p>Initializing exam session with AI competency engine…</p>
          </div>
        )}

        {/* 3. Active timed exam view */}
        {(phase === 'active' || phase === 'submitting') && examData && (
          <form className="exam-runner__form" onSubmit={handleSubmitExam}>
            {/* Live Timer Bar */}
            <header
              className={`exam-runner__timer-bar ${timeLeft <= 180 ? 'is-warning' : ''}`}
              aria-live="polite"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                borderRadius: 8,
                background: timeLeft <= 180 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(139, 92, 246, 0.12)',
                border: timeLeft <= 180 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(139, 92, 246, 0.3)',
                marginBottom: 16,
              }}
            >
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Time Remaining:</span>{' '}
                <strong style={{ fontSize: '1.1rem', letterSpacing: '0.05em' }}>
                  {formatTimeRemaining(timeLeft)}
                </strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Answered: <strong>{answeredCount}</strong> / {totalQuestions}
              </div>
            </header>

            {/* Questions List */}
            <div className="exam-runner__questions-list" style={{ display: 'grid', gap: 18, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
              {examData.questions.map((q, qIndex) => (
                <fieldset
                  key={q.questionId}
                  className="exam-question-card"
                  style={{
                    border: '1px solid var(--task-border)',
                    borderRadius: 10,
                    padding: 14,
                    background: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <legend style={{ fontWeight: 600, fontSize: '0.86rem', padding: '0 6px', color: 'var(--text-primary)' }}>
                    Question {qIndex + 1} of {totalQuestions}
                  </legend>
                  <p style={{ margin: '6px 0 12px', fontSize: '0.84rem', lineHeight: 1.5 }}>
                    {q.question}
                  </p>
                  <div className="exam-question-options" style={{ display: 'grid', gap: 8 }}>
                    {q.options.map((optionText, optIndex) => {
                      const isSelected = answers[q.questionId] === optIndex;
                      return (
                        <label
                          key={optIndex}
                          className={`exam-option-label ${isSelected ? 'is-selected' : ''}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: `1px solid ${isSelected ? '#8b5cf6' : 'rgba(255, 255, 255, 0.08)'}`,
                            background: isSelected ? 'rgba(139, 92, 246, 0.14)' : 'rgba(255, 255, 255, 0.015)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                          }}
                        >
                          <input
                            type="radio"
                            name={`question-${q.questionId}`}
                            value={optIndex}
                            checked={isSelected}
                            onChange={() => handleSelectOption(q.questionId, optIndex)}
                            disabled={phase === 'submitting'}
                            style={{ accentColor: '#8b5cf6' }}
                          />
                          <span>{optionText}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>

            <footer
              className="exam-runner__footer"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 18,
                paddingTop: 14,
                borderTop: '1px solid var(--task-border)',
              }}
            >
              <Button type="button" variant="ghost" onClick={handleAttemptClose}>
                Close Exam
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={phase === 'submitting'}
              >
                {phase === 'submitting' ? 'Submitting Answers…' : 'Submit Exam'}
              </Button>
            </footer>
          </form>
        )}

        {/* 4. Expired state */}
        {phase === 'expired' && (
          <div className="exam-runner__expired" style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⏰</div>
            <h3 style={{ color: '#ef4444', marginBottom: 8 }}>Exam Session Expired</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto 18px' }}>
              The time limit for this exam session has elapsed. Per certification protocol, the task has been reverted
              to the Learning stage. You may review your materials and start an exam attempt when ready.
            </p>
            <Button variant="primary" onClick={onClose}>
              Return to Task
            </Button>
          </div>
        )}

        {/* 5. Exam Result Screen */}
        {phase === 'result' && examResult && (
          <div className="exam-runner__result" style={{ padding: '8px 0' }}>
            <div
              className={`exam-result-banner ${examResult.passed ? 'is-pass' : 'is-fail'}`}
              style={{
                textAlign: 'center',
                padding: '18px',
                borderRadius: 12,
                background: examResult.passed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: examResult.passed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>
                {examResult.passed ? '🎉' : '📚'}
              </div>
              <h3 style={{ margin: '0 0 6px', color: examResult.passed ? '#34d399' : '#f87171' }}>
                {examResult.passed ? 'Exam Passed!' : 'Exam Not Passed'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.92rem' }}>
                Score: <strong>{examResult.score}%</strong> (Passing Grade:{' '}
                <strong>{examResult.minimumPassingPercentage}%</strong>)
              </p>
              <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                Attempt #{examResult.attemptNumber} · {examResult.correctCount} of {examResult.totalCount} correct
              </small>
            </div>

            {/* If Failed: Show retake requirements and return button */}
            {!examResult.passed && (
              <div className="exam-runner__retake-section" style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: '0.84rem', margin: '0 0 8px' }}>Retake Requirements</h4>
                {progression?.stages?.exam?.retake?.requirements?.length ? (
                  <ul className="task-requirements-list" style={{ margin: 0 }}>
                    {progression.stages.exam.retake.requirements.map((req) => (
                      <li key={req.key} className="task-requirement-item task-requirement-item--unmet">
                        <span className="task-requirement-icon">○</span>
                        <span>{req.detail}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted" style={{ fontSize: '0.78rem' }}>
                    Complete required focus study time before unlocking the next attempt.
                  </p>
                )}
              </div>
            )}

            {/* Questions review (showing explanations only when present) */}
            {examResult.questionResults && examResult.questionResults.length > 0 && (
              <div
                className="exam-runner__question-results"
                style={{ maxHeight: '40vh', overflowY: 'auto', display: 'grid', gap: 10, marginBottom: 16 }}
              >
                {examResult.questionResults.map((qr, qrIdx) => (
                  <div
                    key={qr.questionId}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--task-border)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>Question {qrIdx + 1}</strong>
                      <span style={{ color: qr.isCorrect ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                        {qr.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                      </span>
                    </div>
                    {qr.explanation && (
                      <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.76rem', lineHeight: 1.4 }}>
                        {qr.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {examResult.passed ? (
                <Button variant="primary" onClick={onClose}>
                  Continue to Certification →
                </Button>
              ) : (
                <Button variant="primary" onClick={onClose}>
                  Back to Learning
                </Button>
              )}
            </footer>
          </div>
        )}

        {/* Exit Confirmation Sub-dialog */}
        {showExitConfirm && (
          <div
            className="exam-exit-confirm-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(2, 6, 23, 0.85)',
              display: 'grid',
              placeItems: 'center',
              padding: 20,
              zIndex: 10,
              borderRadius: 12,
            }}
          >
            <div
              style={{
                background: 'var(--card-bg, #0f172a)',
                border: '1px solid var(--task-border)',
                borderRadius: 12,
                padding: 20,
                maxWidth: 420,
                textAlign: 'center',
              }}
            >
              <h3 style={{ margin: '0 0 10px', fontSize: '1rem' }}>Active Exam in Progress</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 18px', lineHeight: 1.5 }}>
                Your exam timer is actively running on the server. If you leave now, the timer will keep counting down,
                and you can resume before it expires.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <Button variant="ghost" onClick={() => setShowExitConfirm(false)}>
                  Stay in Exam
                </Button>
                <Button variant="danger" onClick={onClose}>
                  Close & Resume Later
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
