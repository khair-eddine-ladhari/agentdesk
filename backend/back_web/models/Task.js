// models/Task.js (or wherever your other models live, e.g. alongside a Workspace or Document model)

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  assignee: {
    type: String,
    default: null,
  },
  dueDate: {
    type: String,  // kept as String since the agent proposes free-text like "Friday" or "next Tuesday", not a parsed Date
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
  status: {
    type: String,
    enum: ['open', 'in_progress', 'done'],
    default: 'open',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Task', taskSchema);