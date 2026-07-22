const path = require("path");
const fs = require("fs");
const axios = require("axios"); // npm install axios if not already present
const DocumentModel = require("../models/Document");
const Workspace = require("../models/Workspace"); // adjust path if needed

const EXT_TO_TYPE = {
  ".txt": "txt",
  ".md": "md",
  ".pdf": "pdf",
  ".docx": "docx",
};

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// Only .txt/.md are readable as plain text right now. .pdf/.docx need a
// parser library (pdf-parse / mammoth) - not implemented yet, so those
// upload and save metadata fine, but stay "pending" rather than crashing.
function extractText(filePath, fileType) {
  if (fileType === "txt" || fileType === "md") {
    return fs.readFileSync(filePath, "utf-8");
  }
  return null; // signals "can't extract yet" without throwing
}

async function uploadDocument(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileType = EXT_TO_TYPE[ext];
    if (!fileType) {
      return res.status(400).json({ error: `Unsupported file type: ${ext}` });
    }

    const doc = await DocumentModel.create({
      workspace: req.workspaceId,
      uploadedBy: req.userId,
      filename: req.file.originalname,
      fileType,
      status: "pending",
    });

    const text = extractText(req.file.path, fileType);

    if (text === null) {
      return res.status(201).json({
        ...doc.toObject(),
        note: `Metadata saved, but text extraction for ${ext} isn't implemented yet - status stays "pending"`,
      });
    }

    if (!text.trim()) {
      doc.status = "failed";
      await doc.save();
      return res.status(201).json({ ...doc.toObject(), note: "File was empty" });
    }

    // Chunking + embedding now lives entirely in the Python service -
    // Node just forwards plain text and the workspace's Pinecone
    // namespace, then updates status based on what comes back.
    try {
      const workspace = await Workspace.findById(req.workspaceId);

      const { data } = await axios.post(`${AI_SERVICE_URL}/ingest`, {
        text,
        namespace: workspace.pineconeNamespace,
        documentId: doc._id.toString(),
        filename: req.file.originalname,
      });

      doc.status = "embedded";
      await doc.save();

      return res.status(201).json({
        ...doc.toObject(),
        chunkCount: data.chunkCount,
      });
    } catch (ingestErr) {
      console.error(`[uploadDocument] ingest failed for doc ${doc._id}:`, ingestErr.message);
      doc.status = "failed";
      await doc.save();
      return res.status(201).json({
        ...doc.toObject(),
        note: "File saved, but embedding failed",
        detail: ingestErr.message,
      });
    }
  } catch (err) {
    console.error("[uploadDocument] error:", err);
    res.status(500).json({ error: "Failed to upload document" });
  }
}

async function listDocuments(req, res) {
  try {
    const docs = await DocumentModel.find({ workspace: req.workspaceId }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: "Failed to list documents" });
  }
}

module.exports = { uploadDocument, listDocuments };