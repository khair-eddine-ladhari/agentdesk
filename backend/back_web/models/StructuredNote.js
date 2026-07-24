// models/StructuredNote.js

const mongoose = require('mongoose');

const structuredNoteSchema = new mongoose.Schema({
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
  source: {
    type: String,
    enum: ['manual_paste', 'meeting_transcript', 'email'],
    default: 'manual_paste',
  },
  rawText: {
    type: String,
    required: true,
  },
  structured: {
    keyPoints: {
      type: [String],
      default: [],
    },
    actionItems: {
      type: [String],
      default: [],
    },
    mentionedDates: {
      type: [String],
      default: [],
    },
  },
  status: {
    type: String,
    enum: ['draft', 'confirmed'],
    default: 'draft',
  },
  // populated once action items are turned into real Task documents on confirm
  linkedTasks: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Task',
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('StructuredNote', structuredNoteSchema);