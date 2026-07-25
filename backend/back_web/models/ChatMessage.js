// models/ChatMessage.js
const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  agentType: { type: String, default: null }, // which agent produced this (assistant turns only)
  createdAt: { type: Date, default: Date.now },
});

chatMessageSchema.index({ workspace: 1, createdAt: -1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);