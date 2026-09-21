const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  name: { type: String, required: true, trim: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  designation: { type: String, default: '' },
  qualification: { type: String, default: '' },
  experience: { type: Number, default: 0 },
  subjects: [{ type: String }],
  timetable: { type: String, default: '' },
  leaveRequests: [{
    reason: String,
    from: Date,
    to: Date,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  }],
  performanceNotes: { type: String, default: '' },
  status: { type: String, enum: ['active', 'on-leave', 'inactive'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Faculty', facultySchema);
