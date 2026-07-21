const mongoose = require("mongoose");

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // one namespace per workspace, enforces data isolation in Pinecone
    pineconeNamespace: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Workspace", workspaceSchema);