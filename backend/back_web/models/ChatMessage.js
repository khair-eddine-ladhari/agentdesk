// models/ChatMessage.js
const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  agentType: { type: String, default: null }, // which agent produced this (assistant turns only)
  requiresApproval: { type: Boolean, default: false },
  toolCalls: { type: mongoose.Schema.Types.Mixed, default: null },
  logId: { type: mongoose.Schema.Types.ObjectId, ref: "ActionLog", default: null },
  decision: {
    type: String,
    enum: ["pending", "approved", "declined", "failed"],
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
});

chatMessageSchema.index({ workspace: 1, createdAt: -1 });
// Speeds up the findOneAndUpdate({ logId }) calls in approveAction/declineAction
chatMessageSchema.index({ logId: 1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);