const mongoose = require("mongoose");

const actionLogSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
  agentType: String,
  summary: String,
  status: { type: String, enum: ["needs_review", "success", "failed"], default: "needs_review" },
  requiresApproval: Boolean,
  toolCalls: mongoose.Schema.Types.Mixed,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ActionLog", actionLogSchema);