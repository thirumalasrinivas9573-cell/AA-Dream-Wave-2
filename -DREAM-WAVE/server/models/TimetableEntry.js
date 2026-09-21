const mongoose = require('mongoose');
const { WEEKDAYS } = require('../config/constants');

const timetableEntrySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    classSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSection',
      required: true,
      index: true,
    },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    dayOfWeek: { type: String, enum: WEEKDAYS, required: true, index: true },
    startTime: { type: String, required: true, maxlength: 5 },
    endTime: { type: String, required: true, maxlength: 5 },
    room: { type: String, default: '', maxlength: 60 },
    notes: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true }
);

timetableEntrySchema.index({ organizationId: 1, classSection: 1, dayOfWeek: 1 });
timetableEntrySchema.index({ teacher: 1, dayOfWeek: 1 });

module.exports = mongoose.model('TimetableEntry', timetableEntrySchema);
