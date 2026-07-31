const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    filename: { type: String, required: true },
    fileType: {
      type: String,
      enum: ["txt", "md", "pdf", "docx"],
      required: true,
    },

    // Processing state
    status: {
      type: String,
      enum: ["pending", "embedded", "failed"],
      default: "pending",
    },

    // Extracted plain text. select: false keeps it out of list queries
    // (listDocuments) by default — structureDocument explicitly does
    // .select("+rawText") to pull it back in when needed.
    rawText: { type: String, select: false },

    // Set once "Structure this" successfully produces a StructuredNote.
    structuredAt: { type: Date, default: null },
  },
  { timestamps: true } // createdAt / updatedAt
);

module.exports = mongoose.model("Document", DocumentSchema);