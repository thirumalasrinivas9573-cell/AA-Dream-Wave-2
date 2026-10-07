# Dream Wave AI - Task Progression & Certification API Specification

This document is the authoritative API reference for the Three-Stage Task Progression & Certification Pipeline (Learning -> Exam -> Certification) in Dream Wave AI.

---

## 1. Overview & Architecture

Task Progression converts milestones into formal competency credentials. When a task has `workflowEnabled: true`:
1. It cannot be directly marked complete via legacy task PUT endpoints or focus completions (`WORKFLOW_ENFORCED` 403).
2. It proceeds sequentially through three stages:
   - **Learning**: Verified server-side via subtasks, checklist items, and focus study session union intervals.
   - **Exam**: Server-managed, timed, AI-generated multiple-choice assessment (10 questions, 20 min, 80% passing grade). Questions delivered without answers/explanations.
   - **Certification & Resume Linking**: Cryptographically unique credential generation (`DW-CERT-XXXX`), private by default in student profile, linked to exactly one resume in Resume Builder with atomic revision increments.
3. Once completed (`task_completed`), the task is locked against reopening through all legacy update routes (`WORKFLOW_ENFORCED` 403).

---

## 2. Environment Variables & Defaults

| Environment Variable | Default | Purpose |
|----------------------|---------|---------|
| `EXAM_PASS_PERCENT` | `80` | Minimum score percentage required to pass certification exam |
| `EXAM_QUESTION_COUNT` | `10` | Number of questions generated per exam session |
| `EXAM_TIME_LIMIT_MIN` | `20` | Exam expiration window in minutes |
| `MIN_FOCUS_MINUTES_RATIO` | `0.5` | Ratio of task `estimatedMinutes` required for focus study |
| `MIN_REQUIRED_FOCUS_MINUTES` | `15` | Absolute minimum focus minutes required for learning verification |
| `MAX_COUNTED_SESSION_MINUTES` | `120` | Cap on the duration of any single focus session |
| `MIN_COUNTED_SESSION_SECONDS` | `60` | Minimum duration required for a session to count towards focus study |
| `RETAKE_MIN_NEW_FOCUS_MINUTES` | `30` | Minimum new focus study time required after failing an exam before a retake is unlocked |
| `ENGAGEMENT_MIN_FOCUS_MINUTES` | `15` | Minimum focus study threshold for engagement tracking |
| `ALLOW_FALLBACK_EXAM` | `false` | Fallback offline questions if AI generation fails (disabled in production) |
| `AUTO_ENABLE_WORKFLOW` | `false` | Whether to automatically enable workflow on newly created tasks with goalId/roadmapId |

---

## 3. Stages, States, and Status Values

### Top-Level Stages (`progressionStage`)
- `learning`: Active study and requirement completion.
- `exam`: Examination unlocked, active, or undergoing retake cooldown.
- `certification`: Examination passed; credential issuing and resume linking.
- `completed`: Pipeline finalized; task marked completed.

### Detailed Stage Statuses (`stageStatus`)
- `learning_active`: Learning stage in progress.
- `learning_completed`: Learning requirements verified server-side.
- `exam_locked`: Exam locked (requirements unmet or awaiting start).
- `exam_active`: Exam currently started and unexpired.
- `exam_passed`: Exam passed with score >= minimum passing grade.
- `exam_failed`: Exam failed; reverts to learning stage with retake requirements.
- `certification_locked`: Certificate generated; awaiting resume linking and finalization.
- `certification_pending`: Background pipeline running.
- `certification_completed`: Certificate issued and resume linked.
- `task_completed`: Task fully finalized and locked.

### Stage Sub-States
- **Learning** (`stages.learning.state`): `'locked'`, `'current'`, `'ready_for_verification'`, `'completed'`
- **Exam** (`stages.exam.state`): `'locked'`, `'current'`, `'failed'`, `'completed'`
- **Certification** (`stages.certification.state`): `'locked'`, `'generating'`, `'failed'`, `'completed'`

---

## 4. `stagesSummary` Rule

For all standard Task responses (`GET /api/tasks`, `GET /api/tasks/:id`, `PUT /api/tasks/:id`):
- If `workflowEnabled: true`: `stagesSummary` is attached:
  ```json
  {
    "learning": "completed",
    "exam": "completed",
    "certification": "completed"
  }
  ```
  Derived purely from stored Task fields without extra DB queries.
- If `workflowEnabled: false`: `stagesSummary` is `undefined` (omitted from serialized JSON).

---

## 5. Endpoints & Authoritative Real Response Shapes

### 5.1 POST `/api/tasks/:id/progression/enable`
Enables the three-stage progression workflow and freezes an immutable learning snapshot.

**Auth**: Bearer Token (Owner required)
**Body**: None

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Task progression workflow enabled.",
  "progression": {
    "taskId": "6ac51853f1894085fd9b7e4d",
    "workflowEnabled": true,
    "completed": false,
    "progressionStage": "learning",
    "stageStatus": "learning_active",
    "serverNow": "2026-10-06T15:48:36.120Z",
    "links": {
      "goalId": null,
      "roadmapId": null
    },
    "stages": {
      "learning": {
        "state": "current",
        "verified": false,
        "verifiedAt": null,
        "requirements": [
          {
            "key": "focus_time",
            "met": false,
            "detail": "Need at least 30 min of focused study (0 min recorded)."
          }
        ],
        "focus": {
          "minutes": 0,
          "requiredMinutes": 30
        }
      },
      "exam": {
        "state": "locked",
        "locked": true,
        "canUnlock": false,
        "lockedReason": "learning_incomplete",
        "lockedMessage": "Complete learning stage requirements to unlock exam.",
        "attemptsCount": 0,
        "minimumPassingPercentage": 80,
        "questionCount": 10,
        "timeLimitMinutes": 20,
        "activeExam": null,
        "lastAttempt": null,
        "retake": {
          "required": false,
          "requirements": []
        }
      },
      "certification": {
        "state": "locked",
        "certificate": null,
        "recoverableError": null
      }
    }
  }
}
```

---

### 5.2 GET `/api/tasks/:id/progression`
Returns complete progression state. Strictly read-only (does not auto-verify learning), but applies rollback if an active exam has expired.

#### State A: `learning-current` (Requirements Incomplete)
```json
{
  "success": true,
  "progression": {
    "taskId": "6ac51853f1894085fd9b7e4d",
    "workflowEnabled": true,
    "completed": false,
    "progressionStage": "learning",
    "stageStatus": "learning_active",
    "serverNow": "2026-10-06T15:48:36.155Z",
    "links": {
      "goalId": null,
      "roadmapId": null
    },
    "stages": {
      "learning": {
        "state": "current",
        "verified": false,
        "verifiedAt": null,
        "requirements": [
          {
            "key": "focus_time",
            "met": false,
            "detail": "Need at least 30 min of focused study (0 min recorded)."
          }
        ],
        "focus": {
          "minutes": 0,
          "requiredMinutes": 30
        }
      },
      "exam": {
        "state": "locked",
        "locked": true,
        "canUnlock": false,
        "lockedReason": "learning_incomplete",
        "lockedMessage": "Complete learning stage requirements to unlock exam.",
        "attemptsCount": 0,
        "minimumPassingPercentage": 80,
        "questionCount": 10,
        "timeLimitMinutes": 20,
        "activeExam": null,
        "lastAttempt": null,
        "retake": {
          "required": false,
          "requirements": []
        }
      },
      "certification": {
        "state": "locked",
        "certificate": null,
        "recoverableError": null
      }
    }
  }
}
```

#### State B: `ready_for_verification` (Requirements Met, Unverified)
```json
{
  "success": true,
  "progression": {
    "taskId": "6ac51853f1894085fd9b7e4d",
    "workflowEnabled": true,
    "completed": false,
    "progressionStage": "learning",
    "stageStatus": "learning_active",
    "serverNow": "2026-10-06T15:48:36.210Z",
    "links": {
      "goalId": null,
      "roadmapId": null
    },
    "stages": {
      "learning": {
        "state": "ready_for_verification",
        "verified": false,
        "verifiedAt": null,
        "requirements": [
          {
            "key": "focus_time",
            "met": true,
            "detail": "Focused study time satisfied (35 of 30 min recorded)."
          }
        ],
        "focus": {
          "minutes": 35,
          "requiredMinutes": 30
        }
      },
      "exam": {
        "state": "locked",
        "locked": true,
        "canUnlock": true,
        "lockedReason": null,
        "lockedMessage": null,
        "attemptsCount": 0,
        "minimumPassingPercentage": 80,
        "questionCount": 10,
        "timeLimitMinutes": 20,
        "activeExam": null,
        "lastAttempt": null,
        "retake": {
          "required": false,
          "requirements": []
        }
      },
      "certification": {
        "state": "locked",
        "certificate": null,
        "recoverableError": null
      }
    }
  }
}
```

#### State C: `active-exam` (Exam Started and In Progress)
```json
{
  "success": true,
  "progression": {
    "taskId": "6ac51853f1894085fd9b7e4d",
    "workflowEnabled": true,
    "completed": false,
    "progressionStage": "exam",
    "stageStatus": "exam_active",
    "serverNow": "2026-10-06T15:48:36.450Z",
    "links": {
      "goalId": null,
      "roadmapId": null
    },
    "stages": {
      "learning": {
        "state": "completed",
        "verified": true,
        "verifiedAt": "2026-10-06T15:48:36.315Z",
        "requirements": [
          {
            "key": "focus_time",
            "met": true,
            "detail": "Focused study time satisfied (35 of 30 min recorded)."
          }
        ],
        "focus": {
          "minutes": 35,
          "requiredMinutes": 30
        }
      },
      "exam": {
        "state": "current",
        "locked": false,
        "canUnlock": false,
        "lockedReason": null,
        "lockedMessage": null,
        "attemptsCount": 0,
        "minimumPassingPercentage": 80,
        "questionCount": 10,
        "timeLimitMinutes": 20,
        "activeExam": {
          "examId": "6ac51854f1894085fd9b7e52",
          "startedAt": "2026-10-06T15:48:36.350Z",
          "expiresAt": "2026-10-06T16:08:36.350Z",
          "serverNow": "2026-10-06T15:48:36.450Z",
          "remainingSeconds": 1200,
          "timeLimitMinutes": 20,
          "questionCount": 10,
          "questions": [
            {
              "questionId": "q_786733ecbda1",
              "question": "Question 1 on system design?",
              "options": [
                "Option A (Correct)",
                "Option B",
                "Option C",
                "Option D"
              ]
            }
          ]
        },
        "lastAttempt": null,
        "retake": {
          "required": false,
          "requirements": []
        }
      },
      "certification": {
        "state": "locked",
        "certificate": null,
        "recoverableError": null
      }
    }
  }
}
```

#### State D: `failed` (Exam Failed, Retake Requirements Active)
```json
{
  "success": true,
  "progression": {
    "taskId": "6ac51853f1894085fd9b7e4d",
    "workflowEnabled": true,
    "completed": false,
    "progressionStage": "learning",
    "stageStatus": "learning_active",
    "serverNow": "2026-10-06T15:48:36.900Z",
    "links": {
      "goalId": null,
      "roadmapId": null
    },
    "stages": {
      "learning": {
        "state": "current",
        "verified": false,
        "verifiedAt": null,
        "requirements": [
          {
            "key": "focus_time",
            "met": true,
            "detail": "Focused study time satisfied (35 of 30 min recorded)."
          },
          {
            "key": "retake_effort",
            "met": false,
            "detail": "Retake requires at least 30 min of new focus study after failed attempt (0 min recorded)."
          }
        ],
        "focus": {
          "minutes": 35,
          "requiredMinutes": 30
        }
      },
      "exam": {
        "state": "failed",
        "locked": true,
        "canUnlock": false,
        "lockedReason": "retake_requirements_unmet",
        "lockedMessage": "Complete required focus study time before retaking exam.",
        "attemptsCount": 1,
        "minimumPassingPercentage": 80,
        "questionCount": 10,
        "timeLimitMinutes": 20,
        "activeExam": null,
        "lastAttempt": {
          "attemptNumber": 1,
          "score": 0,
          "passed": false,
          "evaluatedAt": "2026-10-06T15:48:36.840Z"
        },
        "retake": {
          "required": true,
          "requirements": [
            {
              "key": "retake_effort",
              "met": false,
              "detail": "Retake requires at least 30 min of new focus study after failed attempt (0 min recorded)."
            }
          ]
        }
      },
      "certification": {
        "state": "locked",
        "certificate": null,
        "recoverableError": null
      }
    }
  }
}
```

#### State E: `certificate-completed` (Pipeline Finalized)
```json
{
  "success": true,
  "progression": {
    "taskId": "6ac51853f1894085fd9b7e4d",
    "workflowEnabled": true,
    "completed": true,
    "progressionStage": "completed",
    "stageStatus": "task_completed",
    "serverNow": "2026-10-06T15:48:37.376Z",
    "links": {
      "goalId": null,
      "roadmapId": null
    },
    "stages": {
      "learning": {
        "state": "completed",
        "verified": true,
        "verifiedAt": "2026-10-06T15:48:37.090Z",
        "requirements": [
          {
            "key": "focus_time",
            "met": true,
            "detail": "Focused study time satisfied (35 of 30 min recorded)."
          }
        ],
        "focus": {
          "minutes": 35,
          "requiredMinutes": 30
        }
      },
      "exam": {
        "state": "completed",
        "locked": false,
        "canUnlock": false,
        "lockedReason": null,
        "lockedMessage": null,
        "attemptsCount": 2,
        "minimumPassingPercentage": 80,
        "questionCount": 10,
        "timeLimitMinutes": 20,
        "activeExam": null,
        "lastAttempt": {
          "attemptNumber": 2,
          "score": 100,
          "passed": true,
          "evaluatedAt": "2026-10-06T15:48:37.174Z"
        },
        "retake": {
          "required": false,
          "requirements": []
        }
      },
      "certification": {
        "state": "completed",
        "certificate": {
          "credentialId": "DW-CERT-9C936F72E7FF",
          "title": "Cloud Mastery",
          "issuer": "Dream Wave AI",
          "issuedAt": "2026-10-06T15:48:37.223Z",
          "url": null,
          "verificationUrl": null,
          "skills": [],
          "skill": "",
          "category": "course",
          "verificationStatus": "verified",
          "documentUrl": null,
          "linkedToResume": true,
          "linkedResumeId": null,
          "linkedResumeIds": []
        },
        "recoverableError": null
      }
    }
  }
}
```

---

### 5.3 POST `/api/tasks/:id/exam/start`
Starts a new exam session or resumes an existing active unexpired session. Auto-verifies learning as a safety net.

**Response (200 OK)**:
```json
{
  "success": true,
  "exam": {
    "examId": "6ac51854f1894085fd9b7e52",
    "startedAt": "2026-10-06T15:48:36.350Z",
    "expiresAt": "2026-10-06T16:08:36.350Z",
    "serverNow": "2026-10-06T15:48:36.360Z",
    "remainingSeconds": 1200,
    "timeLimitMinutes": 20,
    "questionCount": 10,
    "questions": [
      {
        "questionId": "q_786733ecbda1",
        "question": "Question 1 on system design?",
        "options": [
          "Option A (Correct)",
          "Option B",
          "Option C",
          "Option D"
        ]
      }
    ]
  },
  "progression": {
    "taskId": "6ac51853f1894085fd9b7e4d",
    "workflowEnabled": true,
    "completed": false,
    "progressionStage": "exam",
    "stageStatus": "exam_active",
    "serverNow": "2026-10-06T15:48:36.360Z",
    "links": {
      "goalId": null,
      "roadmapId": null
    },
    "stages": { ... }
  }
}
```

---

### 5.4 POST `/api/tasks/:id/exam/submit`
Submits student answers for evaluation.
**Request Body**:
```json
{
  "answers": [
    {
      "questionId": "q_786733ecbda1",
      "selectedIndex": 0
    }
  ]
}
```

#### Successful Pass Response (200 OK)
Explanations are included in `questionResults` ONLY upon passing:
```json
{
  "success": true,
  "result": {
    "score": 100,
    "passed": true,
    "minimumPassingPercentage": 80,
    "attemptNumber": 1,
    "correctCount": 10,
    "totalCount": 10,
    "nextStage": "certification",
    "questionResults": [
      {
        "questionId": "q_786733ecbda1",
        "isCorrect": true,
        "explanation": "Explanation 1"
      }
    ]
  },
  "progression": { ... }
}
```

#### Failing Response (200 OK)
No explanations or correct answers are exposed when failing:
```json
{
  "success": true,
  "result": {
    "score": 0,
    "passed": false,
    "minimumPassingPercentage": 80,
    "attemptNumber": 1,
    "correctCount": 0,
    "totalCount": 10,
    "nextStage": "learning",
    "questionResults": [
      {
        "questionId": "q_786733ecbda1",
        "isCorrect": false
      }
    ]
  },
  "progression": { ... }
}
```

#### Pass with Failed Pipeline Response (200 OK)
Exam passed, but background resume linking or certificate issuance encountered a recoverable error:
```json
{
  "success": true,
  "result": {
    "score": 100,
    "passed": true,
    "minimumPassingPercentage": 80,
    "attemptNumber": 1,
    "correctCount": 10,
    "totalCount": 10,
    "nextStage": "certification",
    "questionResults": [
      {
        "questionId": "q_786733ecbda1",
        "isCorrect": true,
        "explanation": "Explanation 1"
      }
    ]
  },
  "progression": {
    "taskId": "6ac51853f1894085fd9b7e4d",
    "workflowEnabled": true,
    "completed": false,
    "progressionStage": "certification",
    "stageStatus": "exam_passed",
    "serverNow": "2026-10-06T15:48:37.208Z",
    "links": { ... },
    "stages": {
      "learning": { ... },
      "exam": { ... },
      "certification": {
        "state": "failed",
        "certificate": null,
        "recoverableError": {
          "code": "RESUME_LINK_FAILED",
          "message": "Failed to link resume."
        }
      }
    }
  }
}
```

---

### 5.5 POST `/api/tasks/:id/certificate/retry`
Retries issuing certificate, linking to Resume Builder, and completing finalization.

**Response (200 OK)**:
```json
{
  "success": true,
  "progression": {
    "taskId": "6ac51853f1894085fd9b7e4d",
    "workflowEnabled": true,
    "completed": true,
    "progressionStage": "completed",
    "stageStatus": "task_completed",
    "serverNow": "2026-10-06T15:48:37.350Z",
    "links": { ... },
    "stages": {
      "learning": { ... },
      "exam": { ... },
      "certification": {
        "state": "completed",
        "certificate": {
          "credentialId": "DW-CERT-9C936F72E7FF",
          "title": "Cloud Mastery",
          "issuer": "Dream Wave AI",
          "issuedAt": "2026-10-06T15:48:37.223Z",
          "url": null,
          "verificationUrl": null,
          "skills": [],
          "skill": "",
          "category": "course",
          "verificationStatus": "verified",
          "documentUrl": null,
          "linkedToResume": true,
          "linkedResumeId": null,
          "linkedResumeIds": []
        },
        "recoverableError": null
      }
    }
  }
}
```

---

## 6. Error Reference Table

| Code | HTTP Status | Top-Level Extra Fields | Reason |
|------|-------------|------------------------|--------|
| `TASK_NOT_FOUND` | 404 | None | Task ID does not exist or belongs to another user |
| `WORKFLOW_NOT_ENABLED` | 400 | None | Task has `workflowEnabled: false` |
| `LEARNING_INCOMPLETE` | 400 | `requirements: [...]` | Focus time, subtasks, checklist, or retake effort unmet |
| `EXAM_ALREADY_PASSED` | 400 | None | Task has already completed or passed its exam |
| `EXAM_NOT_ACTIVE` | 404 / 409 | None | 404 if no exam document; 409 if exam exists but not active |
| `EXAM_EXPIRED` | 400 | None | Exam session window expired before submission |
| `INVALID_ANSWERS` | 400 | None | Missing or invalid answer array |
| `INVALID_INPUT` | 400 | None | Body not an object or contains illegal keys |
| `INVALID_ID` | 400 | None | Invalid MongoDB ObjectId in parameter |
| `EXAM_GENERATION_FAILED` | 500 | None | AI service generation failure |
| `CERTIFICATION_NOT_ELIGIBLE` | 409 | None | Passed exam attempt required before issuing certificate |
| `CERTIFICATE_GENERATION_FAILED` | 500 | None | DB conflict or certificate generation failure |
| `RESUME_LINK_FAILED` | 500 | None | Failed to link certificate to Resume Builder |
| `FINALIZATION_NOT_ALLOWED` | 409 | `missing: [...]` | Preconditions unmet for completing task |
| `ILLEGAL_STAGE_TRANSITION` | 409 | None | State transition not in `LEGAL_TRANSITIONS` table |
| `TASK_ALREADY_COMPLETED` | 409 | None | Attempted to enable workflow on an already completed task |
| `WORKFLOW_ENFORCED` | 403 | None | Attempted to bypass workflow pipeline via legacy PUT |
| `AUTH_REQUIRED` | 401 | None | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | None | Access denied |

---

## 7. Resume Builder Integration & `REVISION_CONFLICT`

- **Read Path**: `GET /api/career/resumes/:id` returns the resume document containing the `certifications` array:
  ```json
  {
    "certifications": [
      {
        "credentialId": "DW-CERT-9C936F72E7FF",
        "title": "Cloud Mastery",
        "issuer": "Dream Wave AI",
        "issuedAt": "2026-10-06",
        "url": ""
      }
    ]
  }
  ```
- **Revision Control**: Whenever a task certificate is linked to a resume, the resume `revision` number is atomically incremented (`revision = revision + 1`).
- **Conflict Prevention**: If a client attempts to save an older resume draft using a stale `revision` number, the resume controller rejects the update with a `REVISION_CONFLICT` error, preventing concurrent overwrite of task certification achievements.

---

## 8. Focus & Schedule Completion Behavior (`taskCompletionIgnored`)

When a user finishes a focus session or schedule item through planner routes:
- `POST /api/planner/focus/:id/complete` with `{ markTaskComplete: true }`
- `POST /api/planner/schedule/:id/complete` with `{ markTaskComplete: true }`

If the associated task is workflow-enabled (`workflowEnabled: true`):
1. Focus minutes and study history are successfully recorded.
2. The task is **NOT** marked completed (direct completion is prevented).
3. The API response includes `taskCompletionIgnored: true`:
   ```json
   {
     "success": true,
     "session": { ... },
     "taskCompletionIgnored": true
   }
   ```
This informs the client that focus effort was counted, but the task must continue through the learning verification and exam pipeline.
