const mongoose = require('mongoose')

const ENTITY_TYPES = [
  'student', 'goal', 'skill', 'roadmap', 'roadmap_stage', 'topic', 'resource', 'book',
  'project', 'task', 'certificate', 'achievement', 'career', 'role', 'job', 'internship',
  'community_topic', 'subject', 'unit', 'concept', 'exam', 'assignment', 'note',
  'research_project', 'research_source',
  'preference', 'memory', 'event',
  // V4 Prompt 4 — personal knowledge (IDs only; no entity duplication)
  'document', 'opportunity', 'research_note', 'research_claim',
]

const RELATION_TYPES = [
  'HAS_GOAL', 'REQUIRES_SKILL', 'HAS_SKILL', 'LEARNING_SKILL', 'PART_OF_ROADMAP', 'NEXT_STAGE',
  'RELATED_TO', 'LEARNED_THROUGH', 'SAVED_RESOURCE', 'READING_RESOURCE', 'PRACTICED_BY',
  'EVIDENCED_BY', 'TARGETS_ROLE', 'MATCHES_OPPORTUNITY', 'HAS_TASK', 'SUPPORTS_GOAL', 'SUPPORTS_SKILL',
  'ADVANCES_GOAL', 'USES_SKILL',
  'STUDIES_SUBJECT', 'SUBJECT_HAS_UNIT', 'UNIT_HAS_TOPIC', 'TOPIC_MAPS_CONCEPT', 'PREREQUISITE_OF',
  'SUBJECT_HAS_ASSIGNMENT', 'SUBJECT_HAS_EXAM', 'EXAM_COVERS_TOPIC', 'NOTE_SUPPORTS_TOPIC',
  'QUESTION_TESTS_CONCEPT',
  'PREFERS', 'REMEMBERS', 'WORKING_ON', 'CURRENT_FOCUS', 'REGISTERED_FOR', 'INTERESTED_IN',
  // V4 cross-system (references only — no entity duplication)
  'ALIGNS_WITH', 'PREPARES_FOR', 'SUPPORTS_LEARNING', 'PROJECT_FOR_GOAL', 'EVENT_SUPPORTS_GOAL',
  'OPPORTUNITY_SUPPORTS_GOAL', 'RESEARCH_SUPPORTS_PROJECT', 'CAREER_REQUIRES_SKILL',
  // V4 Prompt 4 knowledge relationships
  'MENTIONS', 'DERIVED_FROM', 'APPLIES_TO', 'LEADS_TO', 'DEPENDS_ON',
  'SUPPORTS_CAREER', 'DOCUMENT_SUPPORTS_TOPIC', 'RESEARCH_SUPPORTS_LEARNING',
]

const ORIGIN_TYPES = ['EXPLICIT', 'SYSTEM_DERIVED', 'AI_SUGGESTED']

const knowledgeGraphEdgeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sourceType: { type: String, required: true, enum: ENTITY_TYPES },
  sourceId: { type: String, required: true, trim: true },
  targetType: { type: String, required: true, enum: ENTITY_TYPES },
  targetId: { type: String, required: true, trim: true },
  relationType: { type: String, required: true, enum: RELATION_TYPES },
  origin: { type: String, enum: ORIGIN_TYPES, default: 'SYSTEM_DERIVED' },
  confidence: { type: Number, min: 0, max: 1, default: null },
  label: { type: String, default: '', trim: true, maxlength: 200 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true })

knowledgeGraphEdgeSchema.index(
  { studentId: 1, sourceType: 1, sourceId: 1, targetType: 1, targetId: 1, relationType: 1 },
  { unique: true },
)
knowledgeGraphEdgeSchema.index({ studentId: 1, relationType: 1 })
knowledgeGraphEdgeSchema.index({ studentId: 1, targetType: 1, targetId: 1 })

module.exports = mongoose.model('KnowledgeGraphEdge', knowledgeGraphEdgeSchema)
module.exports.ENTITY_TYPES = ENTITY_TYPES
module.exports.RELATION_TYPES = RELATION_TYPES
module.exports.ORIGIN_TYPES = ORIGIN_TYPES
