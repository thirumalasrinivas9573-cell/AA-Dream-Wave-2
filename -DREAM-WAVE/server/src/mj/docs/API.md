# MJ API Documentation

**Base URL:** `http://localhost:5001/api/mj`  
**Version:** 0.2.0-alpha (Sprint 2 — API Gateway)  
**Auth:** Optional `X-MJ-API-Key` header when `MJ_API_KEY` env var is set

All endpoints return the standardized envelope:

```json
{
  "success": true,
  "timestamp": 1782642058247,
  "requestId": "req_1782642058240_abc123",
  "executionTime": 12,
  "mjState": {
    "running": true,
    "sleeping": false,
    "state": "idle",
    "version": "0.1.0-alpha"
  },
  "payload": { },
  "errors": [],
  "warnings": []
}
```

---

## Gateway Pipeline

Every request passes through:

```
Validation → Logging → Context Builder → Planner → Memory
→ Agent Manager → Execution Queue → Response Builder → API Response
```

No endpoint bypasses this pipeline.

---

## Endpoints

### POST `/api/mj/process`

Process a user message through the MJ core pipeline.

**Request Body:**

```json
{
  "sessionId": "session_abc123",
  "userId": "user_456",
  "message": "Help me plan my learning roadmap",
  "metadata": {
    "source": "web",
    "locale": "en"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | User input (max 10,000 chars) |
| `sessionId` | string | No | Conversation session ID |
| `userId` | string | No | User identifier |
| `metadata` | object | No | Additional context |

**Example:**

```bash
curl -X POST http://localhost:5001/api/mj/process \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello MJ","sessionId":"sess_1","userId":"user_1"}'
```

**Success Response (`200`):**

```json
{
  "success": true,
  "timestamp": 1782642058247,
  "requestId": "req_...",
  "executionTime": 15,
  "mjState": { "running": true, "state": "idle" },
  "payload": {
    "commandId": "cmd_...",
    "response": {
      "id": "res_...",
      "commandId": "cmd_...",
      "content": "",
      "success": true,
      "metadata": { "pipelineComplete": true }
    },
    "plan": { "id": "plan_...", "taskCount": 0 },
    "agent": { "type": "developer", "name": "Developer Agent" },
    "correlationId": "req_..."
  },
  "errors": [],
  "warnings": []
}
```

**Error Response (`400` — validation):**

```json
{
  "success": false,
  "errors": [{ "type": "validation", "code": "MJ_GW_VALIDATION", "message": "message is required..." }],
  "payload": null
}
```

---

### GET `/api/mj/status`

Current MJ state, agents, health, version, and uptime.

**Example:**

```bash
curl http://localhost:5001/api/mj/status
```

**Response:**

```json
{
  "success": true,
  "payload": {
    "state": { "running": true, "sleeping": false, "state": "idle", "version": "0.1.0-alpha" },
    "agents": { "registered": 18, "active": 0 },
    "health": "operational",
    "version": "0.1.0-alpha",
    "uptime": { "ms": 45000, "seconds": 45, "since": 1782642013247 }
  }
}
```

---

### GET `/api/mj/health`

Detailed subsystem health check.

**Example:**

```bash
curl http://localhost:5001/api/mj/health
```

**Response:**

```json
{
  "success": true,
  "payload": {
    "system": { "status": "running", "state": "idle", "version": "0.1.0-alpha", "uptime": {} },
    "memory": { "status": "ready", "stores": 9, "persistence": false },
    "planner": { "status": "ready" },
    "conversation": { "status": "ready" },
    "agents": { "status": "ready", "registered": 18, "active": 0 },
    "eventBus": { "status": "ready", "listenerCount": 0 }
  }
}
```

---

### GET `/api/mj/agents`

All registered agents with name, status, capabilities, and version.

**Example:**

```bash
curl http://localhost:5001/api/mj/agents
```

**Response:**

```json
{
  "success": true,
  "payload": {
    "agents": [
      {
        "id": "agent_developer",
        "name": "Developer Agent",
        "type": "developer",
        "status": "inactive",
        "capabilities": ["code", "debug", "refactor", "architecture"],
        "version": "0.1.0-alpha"
      }
    ],
    "total": 18
  }
}
```

---

### GET `/api/mj/memory`

Memory statistics (architecture stub — no persistence).

**Example:**

```bash
curl http://localhost:5001/api/mj/memory
```

**Response:**

```json
{
  "success": true,
  "payload": {
    "architecture": "stub",
    "persistence": false,
    "stores": [
      { "type": "working", "description": "Short-term active context memory", "count": 0, "status": "ready" }
    ],
    "totalStores": 9
  }
}
```

---

### POST `/api/mj/wake`

Transition MJ to **listening** state.

**Example:**

```bash
curl -X POST http://localhost:5001/api/mj/wake
```

**Response:**

```json
{
  "success": true,
  "payload": {
    "sleeping": false,
    "state": "listening",
    "message": "MJ transitioned to listening state"
  }
}
```

---

### POST `/api/mj/sleep`

Transition MJ to **sleeping** state.

**Example:**

```bash
curl -X POST http://localhost:5001/api/mj/sleep
```

**Response:**

```json
{
  "success": true,
  "payload": {
    "sleeping": true,
    "state": "sleeping",
    "message": "MJ transitioned to sleeping state"
  }
}
```

---

### POST `/api/mj/reset`

Reset MJ runtime state only. Does **not** touch Dream Wave MongoDB or user data.

**Example:**

```bash
curl -X POST http://localhost:5001/api/mj/reset
```

**Response:**

```json
{
  "success": true,
  "payload": {
    "reset": true,
    "state": "idle",
    "message": "MJ runtime state reset. Dream Wave data untouched."
  }
}
```

---

## Error Types

| Type | HTTP | Code | Description |
|------|------|------|-------------|
| `validation` | 400 | `MJ_GW_VALIDATION` | Invalid request input |
| `pipeline` | 502 | `MJ_GW_PIPELINE` | MJ pipeline failure |
| `planner` | 500 | `MJ_GW_PLANNER` | Planner subsystem error |
| `memory` | 500 | `MJ_GW_MEMORY` | Memory subsystem error |
| `agent` | 500 | `MJ_GW_AGENT` | Agent subsystem error |
| `internal` | 500 | `MJ_GW_INTERNAL` | Internal gateway error |
| `unknown` | 500 | `MJ_GW_UNKNOWN` | Unexpected error |

Stack traces are **never** exposed in API responses.

---

## Security (Architecture)

| Middleware | Header | Env Var | Status |
|------------|--------|---------|--------|
| API Key | `X-MJ-API-Key` | `MJ_API_KEY` | Optional enforcement |
| Permission | `Authorization`, `X-User-Id` | — | Architecture stub |
| Rate Limit | — | `MJ_RATE_LIMIT` (default 60/min) | Active |
| JWT / RBAC | — | — | Future sprint |

---

## Headers

| Header | Direction | Description |
|--------|-----------|-------------|
| `X-Request-Id` | Response | Unique request correlation ID |
| `X-MJ-API-Key` | Request | API key (when configured) |
| `X-User-Id` | Request | User context (future RBAC) |
| `Content-Type` | Request | `application/json` for POST endpoints |

---

## Integration Notes

- Frontend, mobile, desktop, voice, and automation engines must use **only** `/api/mj/*`
- Dream Wave existing routes (`/api/auth`, `/api/ai`, etc.) are unchanged
- MJ gateway does not use Dream Wave JWT auth middleware
- Future sprint: wire JWT validation in permission middleware without modifying Dream Wave auth
