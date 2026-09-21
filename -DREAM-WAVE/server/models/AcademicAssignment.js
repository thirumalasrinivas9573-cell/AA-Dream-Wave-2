const mongoose = require('mongoose')

const academicAssignmentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSubject', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 5000, default: '' },
  dueDate: { type: Date, index: true },
  status: { type: String, enum: ['pending', 'in_progress', 'submitted', 'completed', 'archived'], default: 'pending', index: true },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  topicIds: [{ type: mongoose.Schema.Types.ObjectId }],
  conceptIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AcademicConcept' }],
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  source: { type: String, enum: ['student', 'institution', 'imported'], default: 'student' },
}, { timestamps: true })

academicAssignmentSchema.index({ studentId: 1, dueDate: 1 })

module.exports = mongoose.model('AcademicAssignment', academicAssignmentSchema)
