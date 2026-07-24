const mongoose = require("mongoose");

const structuredNoteSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // the original messy text the user submitted, kept for reference/re-processing
  rawQuery: { type: String, required: true },

  // the structured output extracted by the LLM
  key_points: { type: [String], default: [] },
  action_items: { type: [String], default: [] },
  mentioned_dates: { type: [String], default: [] },

  // set only if the LLM's JSON parse failed - lets you flag/inspect bad extractions
  parseError: { type: String, default: null },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("StructuredNote", structuredNoteSchema);