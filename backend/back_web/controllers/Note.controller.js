const StructuredNote = require("../models/StructuredNote");

async function listStructuredNotes(req, res) {
  try {
    const notes = await StructuredNote.find({ workspace: req.workspaceId })
      .populate("documentId", "filename fileType")
      .sort({ createdAt: -1 });

    res.json(notes);
  } catch (err) {
    console.error("[listStructuredNotes] error:", err);
    res.status(500).json({ error: "Failed to list structured notes" });
  }
}

module.exports = { listStructuredNotes };