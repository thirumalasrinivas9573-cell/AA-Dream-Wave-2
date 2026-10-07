# Dream Wave AI - Task Progression & Certification API Specification

This document is the authoritative API reference for the Three-Stage Task Progression & Certification Pipeline (Learning -> Exam -> Certification) in Dream Wave AI.

---

## 1. Overview & Architecture

Task Progression converts milestones into formal competency credentials. When a task has `workflowEnabled: true`:
1. It cannot be directly marked complete via legacy task PUT endpoints or focus completions (`WORKFLOW_ENFORCED` 403).
2. It proceeds sequentially through three stages:
   - **Learning**: Verified server-side via subtasks, checklist items, focus study session union intervals, and retake efforts.
   - **Exam**: Server-managed, timed, AI-generated multiple-choice assessment (10 questions, 20 min, 80% passing grade). Questions delivered without answers/explanations.
   - **Certification & Resume Linking**: Cryptographically unique credential generation (`DW-CERT-XXXX`), private by default in student profile (does not appear on public profile unless owner explicitly opts in), linked to exactly one resume in Resume Builder with atomic revision increments.
3. Once completed (`task_completed`), the task is locked against reopening through all legacy update routes (`WORKFLOW_ENFORCED` 403).

> **Privacy Note**: Task certificates are private by default and do not appear in the public profile unless the owner opts in via student profile privacy settings.

---

## 2. Environment Variables & Defaults

Source: `server/config/progression.js`

| Environment Variable | Default | Purpose |
|----------------------|---------|---------|
| `EXAM_PASS_PERCENT` | `80` | Minimum score percentage required to pass certification exam |
| `EXAM_QUESTION_COUNT` | `10` | Number of questions generated per exam session |
| `EXAM_TIME_LIMIT_MIN` | `20` | Exam expiration window in minutes |
| `MIN_FOCUS_MINUTES_RATIO` | `0.5` | Ratio of task `estimatedMinutes` required for focus study |
| `MIN_REQUIRED_FOCUS_MINUTES` | `10` | Absolute minimum focus minutes required for learning verification |
| `MAX_COUNTED_SESSION_MINUTES` | `120` | Cap on the duration of any single focus session |
| `MIN_COUNTED_SESSION_SECONDS` | `60` | Minimum duration required for a session to count towards focus study |
| `RETAKE_MIN_NEW_FOCUS_MINUTES` | `10` | Minimum new focus study time required after failing an exam before a retake is unlocked |
| `ENGAGEMENT_MIN_FOCUS_MINUTES` | `5` | Minimum focus study threshold for engagement tracking |
| `CERTIFICATE_ISSUER` | `'Dream Wave AI'` | Issuer name stamped onto generated task certificates |
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
The `stageStatus` field strictly adheres to `STAGE_STATUSES` in `server/config/progression.js` and the `Task` model schema:
- `learning_active`: Learning stage in progress.
- `learning_completed`: Learning requirements verified server-side.
- `exam_locked`: Exam locked (requirements unmet or awaiting start).
- `exam_active`: Exam currently started and unexpired.
- `exam_failed`: Exam failed; reverts to learning stage with retake requirements.
- `exam_passed`: Exam passed with score >= minimum passing grade.
- `certification_locked`: Certificate generated; awaiting resume linking and finalization.
- `certification_completed`: Certificate issued and resume linked.
- `task_completed`: Task fully finalized and locked.

*(Note: `certification_pending` is not a valid enum value and does not exist in the codebase).*

### Stage Sub-States
- **Learning** (`stages.learning.state`): `'locked'`, `'current'`, `'ready_for_verification'`, `'completed'`
- **Exam** (`stages.exam.state`): `'locked'`, `'current'`, `'failed'`, `'completed'`
- **Certification** (`stages.certification.state`): `'locked'`, `'generating'`, `'failed'`, `'completed'`

---

## 4. `stagesSummary` Rule

For all standard Task responses (`GET /api/tasks`, `GET /api/tasks/:id`, `POST /api/tasks`, `PUT /api/tasks/:id`):
- If `workflowEnabled: true`: `stagesSummary` is attached:
  ```json
  {
    "learning": "completed",
    "exam": "completed",
    "certification": "completed"
  }
  ```
  Derived purely from stored Task fields without extra DB queries. Values are plain strings representing stage state (`"current"`, `"ready_for_verification"`, `"locked"`, `"completed"`, or `"failed"`).
- If `workflowEnabled: false`: `stagesSummary` is `undefined` (omitted from serialized JSON).

---

## 5. Endpoints & Authoritative Real Response Shapes

> **Note**: Exam payload examples show 1 of N questions for brevity (default: 10 questions per exam); live API responses contain the full array of questions.

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
                "Option A",
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

### 5.3 POST `/api/tasks/:id/progression/verify-learning`
Performs server-side evaluation of all learning stage requirements (focus study session union time, subtasks completion, checklist items completion, and retake study effort if applicable).

**Auth**: Bearer Token (Owner required)  
**Body**: None (Any client payload or flags like `{"learningCompleted": true}` are strictly ignored; verification is computed purely from server records).  

#### Response A: Learning Incomplete (200 OK)
Returns `{ success: true, verified: false, requirements: [...], progression }` when one or more learning criteria remain unmet:
```json
{
  "success": true,
  "verified": false,
  "requirements": [
    {
      "key": "focus_time",
      "met": false,
      "detail": "Need at least 30 min of focused study (0 min recorded).",
      "actual": 0,
      "required": 30
    }
  ],
  "progression": {
    "taskId": "6ac5c8d53cbae19c61429387",
    "workflowEnabled": true,
    "completed": false,
    "progressionStage": "learning",
    "stageStatus": "learning_active",
    "serverNow": "2026-10-07T04:21:42.628Z",
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

#### Response B: Learning Verified (200 OK)
Returns `{ success: true, verified: true, progression }` when all requirements are met. Sets `learningVerifiedAt` and advances `stageStatus` to `learning_completed`, unlocking the exam (`exam.canUnlock: true`):
```json
{
  "success": true,
  "verified": true,
  "progression": {
    "taskId": "6ac5c8d53cbae19c61429387",
    "workflowEnabled": true,
    "completed": false,
    "progressionStage": "learning",
    "stageStatus": "learning_completed",
    "serverNow": "2026-10-07T04:21:42.817Z",
    "links": {
      "goalId": null,
      "roadmapId": null
    },
    "stages": {
      "learning": {
        "state": "completed",
        "verified": true,
        "verifiedAt": "2026-10-07T04:21:42.721Z",
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

**Errors for verify-learning**:
- `400 INVALID_ID`: Param `:id` is not a valid 24-character hex ObjectId.
- `400 WORKFLOW_NOT_ENABLED`: Task has `workflowEnabled: false`.
- `401 AUTH_REQUIRED`: Missing Bearer authorization token.
- `401 SESSION_INVALID`: Bearer token lacks session family id (`sid`).
- `401 TOKEN_INVALID`: Token expired or user record not found.
- `404 TASK_NOT_FOUND`: Task does not exist or belongs to another user.

---

### 5.4 POST `/api/tasks/:id/exam/start`
Starts a new exam session or resumes an existing active unexpired session with HTTP 200. Automatically verifies learning as a safety net if all requirements are satisfied.

**Auth**: Bearer Token (Owner required)  
**Body**: None  
**Rate Limit**: Protected by `examStartLimiter` (40 req/min in production; returns 429 `RATE_LIMITED` on breach).  

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
          "Option A",
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
                "Option A",
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

---

### 5.5 POST `/api/tasks/:id/exam/submit`
Submits student answers for server-side evaluation.

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
  "progression": "same shape as GET /progression (section 5.2)"
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
  "progression": "same shape as GET /progression (section 5.2)"
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
        "state": "completed",
        "locked": false,
        "canUnlock": false,
        "lockedReason": null,
        "lockedMessage": null,
        "attemptsCount": 1,
        "minimumPassingPercentage": 80,
        "questionCount": 10,
        "timeLimitMinutes": 20,
        "activeExam": null,
        "lastAttempt": {
          "attemptNumber": 1,
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

### 5.6 POST `/api/tasks/:id/certificate/retry`
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
        "attemptsCount": 1,
        "minimumPassingPercentage": 80,
        "questionCount": 10,
        "timeLimitMinutes": 20,
        "activeExam": null,
        "lastAttempt": {
          "attemptNumber": 1,
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

## 6. Error Reference Table

| Code | HTTP Status | Top-Level Extra Fields | Reason |
|------|-------------|------------------------|--------|
| `TASK_NOT_FOUND` | 404 | None | Task ID does not exist or belongs to another user |
| `WORKFLOW_NOT_ENABLED` | 400 | None | Task has `workflowEnabled: false` |
| `LEARNING_INCOMPLETE` | 400 | `requirements: [...]` | Focus time, subtasks, checklist, or retake effort unmet before starting exam |
| `EXAM_ALREADY_PASSED` | 400 | None | Task has already completed or passed its exam |
| `EXAM_NOT_ACTIVE` | 404 / 409 | None | 404 if no exam document exists; 409 if exam exists but is not in active state |
| `EXAM_EXPIRED` | 400 | None | Exam session window expired before submission |
| `INVALID_ANSWERS` | 400 | None | Missing, non-array, or invalid answers payload |
| `INVALID_INPUT` | 400 | None | Body not an object or contains unrecognized/disallowed keys |
| `INVALID_ID` | 400 | None | Invalid MongoDB ObjectId in parameter |
| `RATE_LIMIT_EXCEEDED` / `RATE_LIMITED` | 429 | None | Rate limit exceeded on AI exam generation route (`POST /api/tasks/:id/exam/start`) |
| `AUTH_REQUIRED` | 401 | None | Missing Authorization header or missing Bearer token |
| `TOKEN_INVALID` | 401 | None | Token is malformed, invalid signature, or user record deleted |
| `SESSION_INVALID` | 401 | None | Access token missing required session identifier (`sid`) or invalid token type |
| `ACTIVE_FOCUS_SESSION_EXISTS` | 409 | None | Another focus session is currently active or paused on a different task |
| `REVISION_CONFLICT` | 409 | None | Stale revision number submitted during career resume autosave |
| `TASK_ALREADY_COMPLETED` | 409 | None | Attempted to enable workflow on an already completed task |
| `CERTIFICATION_NOT_ELIGIBLE` | 409 | None | Passed exam attempt required before issuing certificate |
| `FINALIZATION_NOT_ALLOWED` | 409 | `missing: [...]` | Preconditions unmet for completing task pipeline |
| `ILLEGAL_STAGE_TRANSITION` | 409 | None | State transition not permitted by workflow state machine |
| `WORKFLOW_ENFORCED` | 403 | None | Attempted to bypass workflow pipeline via legacy task PUT/update routes |
| `FORBIDDEN` | 403 | None | Access denied or insufficient role permissions |
| `EXAM_GENERATION_FAILED` | 500 | None | AI service generation failure |
| `CERTIFICATE_GENERATION_FAILED` | 500 | None | Database conflict or certificate creation failure |
| `RESUME_LINK_FAILED` | 500 | None | Failed to link certificate to Resume Builder |

*(Note: `INVALID_STAGE_TRANSITION` is not used in the codebase; the progression engine emits `ILLEGAL_STAGE_TRANSITION` with HTTP 409).*

### Real Error Response Bodies

#### 1. `LEARNING_INCOMPLETE` (HTTP 400)
Returned when attempting to start an exam (`POST /api/tasks/:id/exam/start`) while learning requirements remain incomplete:
```json
{
  "success": false,
  "code": "LEARNING_INCOMPLETE",
  "message": "Learning requirements not met before starting exam.",
  "requirements": [
    {
      "key": "focus_time",
      "met": false,
      "detail": "Need at least 30 min of focused study (0 min recorded).",
      "actual": 0,
      "required": 30
    }
  ]
}
```

#### 2. `ACTIVE_FOCUS_SESSION_EXISTS` (HTTP 409)
Returned when calling `POST /api/tasks/:id/focus/start` while another focus session is already active or paused for a different task:
```json
{
  "success": false,
  "code": "ACTIVE_FOCUS_SESSION_EXISTS",
  "message": "Another focus session is already active. Please complete or pause it first."
}
```

#### 3. `REVISION_CONFLICT` (HTTP 409)
Returned by Resume Builder (`PUT /api/career/resumes/:id`) when an autosave or update payload submits a stale `revision` number that conflicts with a newer version (e.g. after certificate atomic linking):
```json
{
  "success": false,
  "code": "REVISION_CONFLICT",
  "message": "Resume changed in another session"
}
```

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
- **Conflict Prevention**: If a client attempts to save an older resume draft using a stale `revision` number, the resume controller rejects the update with a `REVISION_CONFLICT` error (HTTP 409), preventing concurrent overwrite of task certification achievements.

---

## 8. Focus & Schedule Completion Behavior (`taskCompletionIgnored`)

When a user completes a focus session or schedule item through planner routes:

### 8.1 Focus Session Completion
- **Route**: `POST /api/planner/focus/:id/complete`
- **Auth**: Bearer Token (Owner required)
- **Request Body**:
  ```json
  {
    "markTaskComplete": true,
    "note": "Completed study block",
    "distractionNote": "Brief interruption note (optional)"
  }
  ```
- **Behavior for Workflow Tasks (`workflowEnabled: true`)**:
  1. Elapsed focus minutes and study session timestamps are saved to the `FocusSession`.
  2. The associated task's `actualMinutes` counter is incremented.
  3. Direct task completion is blocked (`completed` remains `false`).
  4. Response includes `taskCompletionIgnored: true`.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "session": {
      "_id": "6ac5c8eed3d35b25fd52cb9d",
      "userId": "6ac5c8edd3d35b25fd52cb8e",
      "taskId": "6ac5c8edd3d35b25fd52cb8f",
      "startedAt": "2026-10-07T03:52:06.484Z",
      "pausedDurationSeconds": 0,
      "durationSeconds": 1800,
      "plannedDurationMinutes": 0,
      "timerMode": "custom",
      "status": "completed",
      "createdAt": "2026-10-07T04:22:06.486Z",
      "updatedAt": "2026-10-07T04:22:06.560Z",
      "__v": 0,
      "endedAt": "2026-10-07T04:22:06.559Z",
      "note": "Completed study block"
    },
    "taskCompletionIgnored": true
  }
  ```

### 8.2 Schedule Item Completion
- **Route**: `POST /api/planner/schedule/:id/complete`
- **Auth**: Bearer Token (Owner required)
- **Request Body**:
  ```json
  {
    "markTaskComplete": true
  }
  ```
- **Behavior for Workflow Tasks (`workflowEnabled: true`)**:
  1. The schedule item is marked `status: 'completed'`.
  2. The underlying task is guarded by `isWorkflowTask(task)` and is NOT marked completed.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "item": {
      "_id": "6ac5c8f89043dd03be2a0191",
      "userId": "6ac5c8f79043dd03be2a0182",
      "taskId": "6ac5c8f79043dd03be2a0183",
      "title": "Daily Study Block",
      "itemType": "task",
      "scheduledDate": "2026-10-07T04:22:16.149Z",
      "durationMinutes": 30,
      "priority": "Medium",
      "priorityScore": 0,
      "status": "completed",
      "source": "manual",
      "createdAt": "2026-10-07T04:22:16.150Z",
      "updatedAt": "2026-10-07T04:22:16.162Z",
      "__v": 0
    }
  }
  ```

### 8.3 Task-Level Focus Routes (`server/routes/tasks.js`)
- `POST /api/tasks/:id/focus/start`: Starts a new session or resumes the existing active session if for the same task. If a session is active for a different task, returns 409 `ACTIVE_FOCUS_SESSION_EXISTS`.
- `POST /api/tasks/:id/focus/stop`: Completes the active focus session, updates `actualMinutes`, and returns `{ success: true, session }`. Does not mark the task completed.

---

## 9. Requirements Evaluated by `verifyLearning`

The `verifyLearning` method (and `POST /api/tasks/:id/progression/verify-learning`) dynamically evaluates the following requirement keys:

| Requirement Key | When It Appears | Fields Returned | Example Detail Text |
|-----------------|-----------------|-----------------|---------------------|
| `focus_time` | Always present for every workflow task. | `key`, `met`, `detail`, `actual`, `required` | Met: `"Focused study time satisfied (35 of 30 min recorded)."`<br>Unmet: `"Need at least 30 min of focused study (0 min recorded)."` |
| `subtasks` | Appears when `snapshotSubtaskCount > 0` or task has subtasks in `task.subtasks`. | `key`, `met`, `detail`, `total`, `completed` | Met: `"All 3 subtask(s) completed."`<br>Incomplete: `"1 of 3 subtask(s) incomplete."`<br>Deleted below snapshot: `"Subtasks deleted: expected at least 3 subtask(s), currently have 2."` |
| `checklist` | Appears when `snapshotChecklistCount > 0` or task has checklist items in `task.checklist`. | `key`, `met`, `detail`, `total`, `completed` | Met: `"All 4 checklist item(s) done."`<br>Incomplete: `"2 of 4 checklist item(s) remaining."`<br>Deleted below snapshot: `"Checklist items deleted: expected at least 4 item(s), currently have 2."` |
| `retake_effort` | Appears only after an exam has been failed, when retake study requirements become active. | `key`, `met`, `detail`, `actual`, `required` | Met: `"New study effort recorded since previous exam failure (15 of 10 min)."`<br>Unmet: `"Retake requires at least 10 min of new focus study after failed attempt (0 min recorded)."` |

---

## 10. Notes for Frontend

1. **`stagesSummary` values are plain strings**: The values mapped to keys (`learning`, `exam`, `certification`) are plain strings representing status (e.g., `'current'`, `'ready_for_verification'`, `'locked'`, `'completed'`, `'failed'`). They are not nested objects.
2. **`POST /api/tasks/:id/exam/start` resumes with 200**: Calling exam start when an exam session is already active returns HTTP 200 with the active exam delivery (including remaining seconds and randomized question order), rather than an error.
3. **Use `serverNow` and `remainingSeconds`, not client clock**: Always compute timer expirations and remaining durations using `serverNow` and `remainingSeconds` from the server response to avoid clock skew discrepancies.
4. **On any 409 Conflict, refetch `GET /api/tasks/:id/progression`**: A 409 indicates state mismatch (e.g. `REVISION_CONFLICT`, `FINALIZATION_NOT_ALLOWED`, `ACTIVE_FOCUS_SESSION_EXISTS`). Clients should immediately refetch progression state to synchronize UI.
5. **`certificate.linkedResumeId` may be null**: When a certificate is linked to student profile credentials without being attached to a specific resume, `linkedResumeId` is `null` (with `linkedToResume: true` or `false`). The frontend must not require `linkedResumeId` to be a non-null string.
