# MJ Memory MongoDB Schema

All collections use isolated names prefixed with `mj_`. Indexes are created on bootstrap via `ensureIndexes()`.

## Shared Fields (baseSchema)

Every memory document includes:

```javascript
{
  userId: String,          // required, indexed
  sessionId: String,       // optional, indexed
  category: String,        // required, indexed
  tags: [String],
  importanceScore: Number, // 0–1, default 0.5
  recencyScore: Number,    // 0–1, default 1
  accessCount: Number,     // default 0
  confidence: Number,      // 0–1, default 0.8
  expirationPolicy: String,// never|session|daily|weekly|monthly|custom
  expiresAt: Date,
  archived: Boolean,       // default false, indexed
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
```

---

## mj_memory

General knowledge and system memories.

```javascript
{
  ...baseFields,
  content: String,         // required
  summary: String,
  projectId: String,       // indexed
  source: String           // default 'mj'
}
```

**Indexes:** userId, category, projectId, archived, tags, updatedAt

---

## mj_conversations

Conversation history and summaries.

```javascript
{
  ...baseFields,
  sessionId: String,       // required, indexed
  messages: [{
    role: 'user'|'assistant'|'system',
    content: String,
    timestamp: Date
  }],
  summary: String,
  messageCount: Number,
  lastMessageAt: Date
}
```

**Indexes:** userId, sessionId, archived, updatedAt

---

## mj_projects

Project-scoped context and architecture decisions.

```javascript
{
  ...baseFields,
  projectId: String,       // required, indexed
  name: String,            // required
  description: String,
  sprint: String,
  architectureNotes: String,
  documents: [{ title, content, addedAt }],
  status: 'active'|'archived'|'completed'
}
```

**Indexes:** userId, projectId, archived, status

---

## mj_preferences

User preferences (coding style, UI, language).

```javascript
{
  ...baseFields,
  key: String,             // required
  value: Mixed,            // required
  preferenceType: 'coding'|'ui'|'language'|'general'
}
```

**Indexes:** userId, key, preferenceType, archived

---

## mj_learning

Learning progress and quiz history.

```javascript
{
  ...baseFields,
  topic: String,           // required, indexed
  skillLevel: 'beginner'|'intermediate'|'advanced'|'mastered',
  weakAreas: [String],
  quizHistory: [{ score, total, takenAt }],
  progress: Number         // 0–100
}
```

**Indexes:** userId, topic, skillLevel, archived

---

## mj_tasks

Task assignments and completion tracking.

```javascript
{
  ...baseFields,
  taskId: String,          // indexed
  title: String,           // required
  description: String,
  status: 'pending'|'in_progress'|'completed'|'cancelled',
  deadline: Date,
  completedAt: Date
}
```

**Indexes:** userId, taskId, status, deadline, archived

---

## mj_sessions

Session tracking for conversation continuity.

```javascript
{
  userId: String,            // required, indexed
  sessionId: String,       // required, unique, indexed
  startedAt: Date,
  lastActiveAt: Date,
  endedAt: Date,
  messageCount: Number,
  summary: String,
  archived: Boolean,
  metadata: Object
}
```

**Indexes:** userId, sessionId (unique), archived, lastActiveAt

---

## Query Patterns

| Use Case | Filter |
|----------|--------|
| User memories | `{ userId, archived: false }` |
| Keyword search | `{ $or: [{ content: regex }, { summary: regex }, { tags: regex }] }` |
| Project scope | `{ userId, projectId, archived: false }` |
| Session scope | `{ userId, sessionId, archived: false }` |
| Expired cleanup | `{ expiresAt: { $lt: now }, archived: false }` |

---

## Scalability Notes

- All collections support pagination via `skip`/`limit`
- Compound indexes recommended for production: `{ userId: 1, category: 1, updatedAt: -1 }`
- Archive instead of delete for audit trail
- Future: shard key = `userId`
