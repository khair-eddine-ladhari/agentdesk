const path = require("path");
const DocumentModel = require("../models/Document");

const EXT_TO_TYPE = {
  ".txt": "txt",
  ".md": "md",
  ".pdf": "pdf",
  ".docx": "docx",
};

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
      status: "pending", // flips to "embedded" once the Python service processes it
    });

    // NOTE: this only stores the file + metadata. Sending the file's text to
    // the Python service for chunking/embedding into Pinecone isn't wired up
    // yet - that's part of the RAG agent work we're deferring for now.

    res.status(201).json(doc);
  } catch (err) {
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