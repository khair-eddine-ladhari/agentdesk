const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    filename: { type: String, required: true },
    fileType: { type: String, enum: ["txt", "md", "pdf", "docx"], required: true },
    status: { type: String, enum: ["pending", "embedded", "failed"], default: "pending" },
    rawText: { type: String, select: false }, // select:false keeps it out of normal find()/list responses
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);