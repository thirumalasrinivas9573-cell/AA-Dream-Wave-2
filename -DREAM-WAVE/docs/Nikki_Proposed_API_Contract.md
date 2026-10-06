# DREAM WAVE AI: Task Progression API Contract (PROPOSED v1)
Author: Nikki (backend). Reviewer: Thiru (frontend).
Status: PROPOSED. Services are built (Steps 1-4). Routes/controllers are implemented in Step 5 and will match this document exactly once agreed. Items marked [TBD] depend on Step 4 findings.

Flow: LEARNING -> EXAM -> CERTIFICATION -> (Resume Builder) -> TASK COMPLETED

---

## 0. CONVENTIONS

- Auth: existing JWT middleware on every endpoint. User identity comes from the token only; the client never sends a userId.
- Base path: `/api/tasks`
- Success: `{ "success": true, ...data }`
- Error: `{ "success": false, "code": "ERROR_CODE", "message": "User friendly text", ...optionalExtra }`
- The backend is the source of truth. The client must never send or compute: stage, status, score, passed, completed, certificate flags.
- The backend returns a ready-made UI `state` per stage so React does not map raw statuses.

### Stage `state` values (per stage)
`locked` | `current` | `completed` | `failed` | `generating`

### Raw fields (for reference/debugging; UI should prefer `stages.*.state`)
`progressionStage`: `learning` | `exam` | `certification` | `completed`
`stageStatus`: `learning_active`, `learning_completed`, `exam_locked`, `exam_active`, `exam_failed`, `exam_passed`, `certification_locked`, `certification_completed`, `task_completed`

---

## 1. WORKFLOW vs LEGACY TASKS

Every task object returned by the EXISTING task endpoints (`GET /api/tasks`, `GET /api/tasks/:id`, create/update responses) now includes:

```json
{
  "workflowEnabled": true,
  "progressionStage": "learning",
  "stageStatus": "learning_active",
  "certificateId": null
}
```

- `workflowEnabled: false` -> legacy task, old behavior, old UI.
- `workflowEnabled: true` -> render the three-stage UI.
- Clients cannot set these fields (they are stripped server-side).

### Enabling the workflow on a task
`POST /api/tasks/:id/progression/enable`
- Body: none
- Owner-scoped. Allowed only if the task is not already completed.
- Idempotent: calling twice returns the same state.
- 200 -> `{ success: true, progression: <Progression> }`
- Errors: `TASK_NOT_FOUND` (404), `TASK_ALREADY_COMPLETED` (409)
- [DECISION NEEDED with Thiru]: alternatively the server auto-enables the workflow for certain tasks at creation (e.g. tasks linked to a goal/roadmap) so there is no extra call. Pick one.

---

## 2. THE PROGRESSION OBJECT (returned by almost every endpoint)

```json
{
  "taskId": "665f...",
  "workflowEnabled": true,
  "completed": false,
  "progressionStage": "learning",
  "stageStatus": "learning_active",
  "links": { "goalId": "..." , "roadmapId": null },
  "stages": {
    "learning": {
      "state": "current",
      "verified": false,
      "verifiedAt": null,
      "requirements": [
        { "key": "focus_time", "met": false, "detail": "Focused 12 of 30 required minutes" },
        { "key": "subtasks", "met": true,  "detail": "All 4 subtasks completed" },
        { "key": "checklist", "met": true, "detail": "No checklist items" }
      ],
      "focus": { "minutes": 12, "requiredMinutes": 30 }
    },
    "exam": {
      "state": "locked",
      "locked": true,
      "lockedReason": "LEARNING_INCOMPLETE",
      "lockedMessage": "Finish 18 more focus minutes to unlock the exam.",
      "attemptsCount": 0,
      "minimumPassingPercentage": 80,
      "questionCount": 10,
      "timeLimitMinutes": 20,
      "activeExam": null,
      "lastAttempt": null,
      "retake": { "required": false, "requirements": [] }
    },
    "certification": {
      "state": "locked",
      "certificate": null,
      "recoverableError": null
    }
  }
}
```

Notes for the UI:
- `requirements[]` is the "what remains" list. Render each item; show the unmet ones as the reason Exam is locked.
- `exam.lockedReason` is a machine code, `exam.lockedMessage` is display text.
- `exam.minimumPassingPercentage` always comes from here. Never hardcode it in React.
- After a FAIL, `stages.learning.state` becomes `current`, `stages.exam.state` becomes `locked`, `exam.lastAttempt` holds the failed result, and `exam.retake.requirements` lists the extra learning effort required (for example "Log 10 new focus minutes since your last attempt").
- `certification.state` values: `locked` (exam not passed), `generating` (exam passed, certificate being issued/linked), `completed`, `failed` (recoverable; show a Retry button).
- `certification.recoverableError`: `null` or `{ "code": "CERTIFICATE_GENERATION_FAILED" | "RESUME_LINK_FAILED", "message": "..." }`.
- `certification.certificate` (when it exists):

```json
{
  "credentialId": "DW-CERT-9F3K2QX7LM",
  "title": "Advanced React Patterns",
  "issuer": "Dream Wave AI",
  "issueDate": "2026-10-07T09:12:00.000Z",
  "skills": ["React", "State Management"],
  "linkedToResume": true,
  "verificationUrl": null
}
```
`verificationUrl` is `null` unless a public verification route exists [TBD]. Certificates are never published publicly by default.
- `completed` is `true` only when `stageStatus` is `task_completed`.

---

## 3. ENDPOINTS

### 3.1 GET `/api/tasks/:id/progression`   (page refresh / single source of truth)
- Pure read of the current state. Safe to call repeatedly or poll (for example while `certification.state` is `generating`).
- Lazily handles an expired active exam (rolls back to Learning) before responding.
- 200 -> `{ success: true, progression: <Progression> }`
- Errors: `TASK_NOT_FOUND` (404, also returned for tasks owned by someone else), `WORKFLOW_NOT_ENABLED` (400)

### 3.2 POST `/api/tasks/:id/progression/verify-learning`
- Body: none (the client sends NO completion flag; the server re-checks trusted data).
- Re-verifies learning from server-side data and, if satisfied, records `learningVerifiedAt` and moves to `learning_completed`. Idempotent.
- 200 -> `{ success: true, verified: true|false, progression: <Progression> }` (incomplete learning is a normal 200 with `verified: false` and the requirements list, not an error)
- Errors: `TASK_NOT_FOUND`, `WORKFLOW_NOT_ENABLED`, `ILLEGAL_STAGE_TRANSITION` (409)

### 3.3 POST `/api/tasks/:id/exam/start`
- Body: none
- Requires verified learning (and the retake requirement after a fail). Returns the existing active unexpired exam if there is one (resume), otherwise generates a new one.
- Correct answers and explanations are NEVER included.
- 200:
```json
{
  "success": true,
  "exam": {
    "examId": "...",
    "startedAt": "...",
    "expiresAt": "...",
    "timeLimitMinutes": 20,
    "questionCount": 10,
    "questions": [
      { "questionId": "q_1", "question": "...", "options": ["A", "B", "C", "D"] }
    ]
  },
  "progression": { }
}
```
- Errors: `LEARNING_INCOMPLETE` (400, includes `requirements[]`), `EXAM_ALREADY_PASSED` (400), `EXAM_GENERATION_FAILED` (500, recoverable, offer Retry), `TASK_NOT_FOUND`, `WORKFLOW_NOT_ENABLED`

### 3.4 POST `/api/tasks/:id/exam/submit`
- Body:
```json
{ "answers": [ { "questionId": "q_1", "selectedIndex": 2 } ] }
```
- Any `score` / `passed` in the body is ignored. Unanswered questions count as wrong. `selectedIndex` must be 0-3.
- The server scores, persists the attempt, and on PASS immediately runs the certificate pipeline (certificate, Resume Builder linkage, task completion).
- 200 (pass or fail are both 200; read `result.passed`):
```json
{
  "success": true,
  "result": {
    "score": 90,
    "passed": true,
    "minimumPassingPercentage": 80,
    "attemptNumber": 1,
    "correctCount": 9,
    "totalCount": 10,
    "nextStage": "certification",
    "questionResults": [
      { "questionId": "q_1", "isCorrect": true, "explanation": "..." }
    ]
  },
  "progression": { }
}
```
  - On FAIL: `nextStage` is `"learning"`; `questionResults` has `isCorrect` only (no explanations and no correct answers); `progression` already shows the rolled-back Learning stage.
  - On PASS: `explanations` are included; `progression.stages.certification.state` is `completed` if the pipeline succeeded, or `failed` with `recoverableError` if it didn't. The pass result is preserved either way.
- Errors: `INVALID_ANSWERS` (400), `EXAM_EXPIRED` (400, progression rolled back to Learning), `EXAM_NOT_ACTIVE` (404 no active exam, 409 double submit), `TASK_NOT_FOUND`, `WORKFLOW_NOT_ENABLED`

### 3.5 POST `/api/tasks/:id/certificate/retry`
- Body: none. Safe to call repeatedly (idempotent). Resumes the pipeline from whichever step is incomplete (issue, then link to Resume Builder, then finalize). Never creates a duplicate certificate.
- 200 -> `{ success: true, progression: <Progression> }`
- Errors: `CERTIFICATION_NOT_ELIGIBLE` (409, exam not passed), `CERTIFICATE_GENERATION_FAILED` (500, recoverable), `RESUME_LINK_FAILED` (500, recoverable), `TASK_NOT_FOUND`, `WORKFLOW_NOT_ENABLED`

### 3.6 Resume Builder
- The linkage is done by the backend inside the pipeline. The client does NOT create or attach certificates.
- The Resume Builder shows the certificate through its existing read endpoint [TBD: exact endpoint and field path under `/api/career/resumes`, confirmed in Step 4 Phase 0].
- The client only reads `certification.certificate.linkedToResume` to show "Available in Resume Builder".

### 3.7 Existing completion path (workflow tasks)
- `PUT /api/tasks/:id` with `{ completed: true }`, `{ status: "completed" }`, or `{ progress: 100 }` on a workflow task returns:
  `403 { success:false, code:"WORKFLOW_ENFORCED", message:"This task is completed through Learning, Exam and Certification." }`
- The same guard applies to focus/planner/goal-execution/agent completion paths.
- Note for Thiru: `PATCH /tasks/:id/toggle` (client/src/services/endpoints.ts:148) does NOT exist on the server. For workflow tasks, never call a completion toggle.
- Protected fields (client cannot set): `workflowEnabled`, `progressionStage`, `stageStatus`, `learningVerifiedAt`, `examId`, `examAttemptsCount`, `certificateId`, `resumeLinkedAt`, `actualMinutes`.

---

## 4. ERROR CODES

| Code | HTTP | Meaning | UI action |
|---|---|---|---|
| (auth middleware) | 401 | Missing/expired token [TBD: confirm the existing code string] | Existing re-login flow |
| `WORKFLOW_ENFORCED` | 403 | Tried to complete a workflow task directly | Explain the required stages |
| (auth/role) | 403 | Not allowed [TBD: existing code] | Show access error |
| `TASK_NOT_FOUND` | 404 | Missing or not owned by user | Show not found |
| `WORKFLOW_NOT_ENABLED` | 400 | Progression call on a legacy task | Use legacy UI |
| `LEARNING_INCOMPLETE` | 400 | Exam blocked; response includes `requirements[]` | Show what remains and link to learning |
| `EXAM_ALREADY_PASSED` | 400 | Exam already passed | Refresh state |
| `EXAM_NOT_ACTIVE` | 404 / 409 | No active exam, or double submit | Refresh state |
| `EXAM_EXPIRED` | 400 | Time limit passed; rolled back to Learning | Show expiry and the Learning stage |
| `INVALID_ANSWERS` | 400 | Malformed answers | Show validation error |
| `EXAM_GENERATION_FAILED` | 500 (recoverable) | AI could not produce a valid exam | Retry button |
| `CERTIFICATION_NOT_ELIGIBLE` | 409 | Exam not passed | Refresh state |
| `CERTIFICATE_GENERATION_FAILED` | 500 (recoverable) | Certificate not issued; exam result kept | Retry certificate |
| `RESUME_LINK_FAILED` | 500 (recoverable) | Resume linkage failed; certificate kept | Retry certificate |
| `FINALIZATION_NOT_ALLOWED` | 409 | Missing prerequisites; includes `missing[]` | Show what is missing |
| `ILLEGAL_STAGE_TRANSITION` | 409 | Concurrent or invalid transition | Refresh state |
| `TASK_ALREADY_COMPLETED` | 409 | Enable called on a completed task | Show completed state |
| (validation) | 400 | Bad request body/params | Show message |
| Network failure | n/a | Client-side only (no response) | Show offline/retry |

Rule for the client: on ANY 409, call GET `/progression` and re-render from the server.

---

## 5. STATE FLOW THE CLIENT WILL SEE

1. Created + enabled: Learning `current`, Exam `locked`, Certification `locked`.
2. Learning requirements met -> verify-learning -> Learning `completed`, Exam `current` (unlocked).
3. exam/start -> questions; submit:
   - FAIL: Learning `current`, Exam `locked` (`lastAttempt` shows the failed score, `retake.requirements` shows what to do).
   - PASS: Exam `completed`, Certification `generating`, then `completed`, then the task is `completed`.
4. If the pipeline fails after a PASS: Exam stays `completed`, Certification `failed` with `recoverableError`, use `certificate/retry`.
5. Refresh at any point: GET `/progression` returns the same state.

---

## 6. OPEN ITEMS (to settle before Step 5)
1. Auto-enable vs `progression/enable` endpoint (section 1).
2. Exact Resume Builder read endpoint and field path [TBD, Step 4].
3. Existing 401/403 error code strings [TBD, confirm from middleware].
4. Whether a public verification route exists for `verificationUrl` (default `null`, nothing public).
5. Poll interval suggestion for the `generating` state (propose 2s, max 10 tries, then show Retry).
