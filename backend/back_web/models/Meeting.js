// models/Meeting.js

const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  attendees: {
    type: [String],  // kept as free-text emails/names, same reasoning as Task.dueDate -
    default: [],      // the agent proposes whatever the user described, not verified contacts yet
  },
  time: {
    type: String,   // free-text like "Friday 2pm" - not a parsed Date, same rationale as Task.dueDate
    default: null,
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Meeting', meetingSchema);