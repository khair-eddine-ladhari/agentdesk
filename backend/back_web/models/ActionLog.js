const mongoose = require("mongoose");

const actionLogSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    agentType: { type: String, enum: ["rag", "structuring", "action"], required: true },
    // plain-language description, e.g. "Drafted a follow-up email to Sarah"
    summary: { type: String, required: true },
    status: { type: String, enum: ["success", "needs_review", "failed"], default: "needs_review" },
    requiresApproval: { type: Boolean, default: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActionLog", actionLogSchema);