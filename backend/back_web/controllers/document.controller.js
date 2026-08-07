const path = require("path");
const axios = require("axios");
const pdfParse = require("pdf-parse");
const cloudinary = require("../config/cloudinary"); // see note below
const DocumentModel = require("../models/Document");
const Workspace = require("../models/Workspace");
const StructuredNote = require("../models/StructuredNote");

const mammoth = require("mammoth");
const EXT_TO_TYPE = {
  ".txt": "txt",
  ".md": "md",
  ".pdf": "pdf",
  ".docx": "docx",
};

const AI_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8000";

// Now reads from a buffer (req.file.buffer) instead of a disk path —
// memoryStorage gives us the whole file in memory, nothing to fs.readFileSync.
async function extractText(buffer, fileType) {
  if (fileType === "txt" || fileType === "md") {
    return buffer.toString("utf-8");
  }

  if (fileType === "pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (fileType === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  return null;
}

// Cloudinary's SDK is disk/callback-oriented by default; this wraps
// upload_stream in a promise and pipes the buffer into it.
function uploadBufferToCloudinary(buffer, filename) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw", // required for non-image files (pdf/docx/txt/md)
        folder: "documents",
        public_id: `${Date.now()}-${path.parse(filename).name}`,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
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

    let text;
    try {
      text = await extractText(req.file.buffer, fileType);
    } catch (extractErr) {
      console.error(`[uploadDocument] extraction failed for doc ${doc._id}:`, extractErr.message);
      doc.status = "failed";
      await doc.save();
      return res.status(201).json({
        ...doc.toObject(),
        note: "Text extraction failed - the file may be corrupted, encrypted, or a scanned image with no selectable text.",
        detail: process.env.NODE_ENV === "production" ? undefined : extractErr.message,
      });
    }

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

    // Only upload to Cloudinary once we know the file is valid and non-empty —
    // no point storing something that failed extraction.
    try {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname);
      doc.cloudinaryUrl = uploadResult.secure_url;
      doc.cloudinaryPublicId = uploadResult.public_id;
    } catch (cloudErr) {
      // Temporary verbose logging to diagnose the 403 — logs the FULL error
      // object (Cloudinary buries the real reason in nested fields, not
      // just .message). Revert to cloudErr.message once this is resolved.
      console.error(
        `[uploadDocument] Cloudinary upload failed for doc ${doc._id}:`,
        JSON.stringify(cloudErr, Object.getOwnPropertyNames(cloudErr), 2)
      );
      doc.status = "failed";
      await doc.save();
      return res.status(201).json({
        ...doc.toObject(),
        note: "File processed, but storage upload failed",
        detail: process.env.NODE_ENV === "production" ? undefined : cloudErr.message,
      });
    }

    doc.rawText = text;
    await doc.save();

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
        console.error(`[uploadDocument] ingest failed for doc ${doc._id}:`);
  console.error("  message:", ingestErr.message);
  console.error("  code:", ingestErr.code);
  console.error("  status:", ingestErr.response?.status);
  console.error("  data:", JSON.stringify(ingestErr.response?.data));
      doc.status = "failed";
      await doc.save();
      return res.status(201).json({
        ...doc.toObject(),
        note: "File saved, but embedding failed",
        detail: process.env.NODE_ENV === "production" ? undefined : ingestErr.message,
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

async function structureDocument(req, res) {
  try {
    const doc = await DocumentModel.findOne({
      _id: req.params.docId,
      workspace: req.workspaceId,
    }).select("+rawText");

    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (!doc.rawText) {
      return res.status(400).json({
        error: "No extracted text available for this document",
        note: "Text extraction may not be implemented for this file type, or the file failed to embed.",
      });
    }

    const workspace = await Workspace.findById(req.workspaceId);

    const { data } = await axios.post(`${AI_SERVICE_URL}/agents/run`, {
      query: doc.rawText,
      namespace: workspace.pineconeNamespace,
      agentType: "structuring",
    });

    if (data.agentType !== "structuring") {
      return res.status(502).json({
        error: `Expected structuring result, got agentType "${data.agentType}"`,
        raw: data,
      });
    }

    let structured;
    try {
      structured = JSON.parse(data.result);
    } catch (parseErr) {
      return res.status(502).json({
        error: "Failed to parse structured result from AI service",
        raw: data.result,
      });
    }

    const note = await StructuredNote.create({
      workspace: req.workspaceId,
      createdBy: req.userId,
      documentId: doc._id,
      rawQuery: doc.rawText,
      key_points: structured.key_points || [],
      action_items: structured.action_items || [],
      mentioned_dates: structured.mentioned_dates || [],
      parseError: structured._parse_error || null,
    });

    res.status(201).json({ note });
  } catch (err) {
    console.error("[structureDocument] error:", err);
    res.status(500).json({ error: "Failed to structure document" });
  }
}

module.exports = { uploadDocument, listDocuments, structureDocument };